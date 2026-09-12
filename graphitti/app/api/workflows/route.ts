import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { member, userWallets, workflows } from "@/lib/db/schema";
import { CATALOG_TEMPLATE_NAMES } from "@/lib/marketplace/catalog";
import { cloneCatalogTemplatesForUser } from "@/lib/marketplace/clone-catalog";
import { hasMinimumOrgRole, type OrgRole } from "@/lib/org/member-role";

export const dynamic = "force-dynamic";

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

export async function GET(request: Request) {
  const noStore = {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  };

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json([], { status: 200, headers: noStore });
    }

    const activeOrganizationId = session.session.activeOrganizationId ?? null;

    let activeOrgRole: OrgRole | null = null;
    if (activeOrganizationId) {
      const activeMembership = await db.query.member.findFirst({
        where: and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, activeOrganizationId)
        ),
      });
      if (
        activeMembership?.role &&
        hasMinimumOrgRole(activeMembership.role, "member")
      ) {
        activeOrgRole = activeMembership.role as OrgRole;
      }
    }

    const memberships = await db
      .select({ organizationId: member.organizationId })
      .from(member)
      .where(eq(member.userId, session.user.id));
    const orgIds = memberships.map((row) => row.organizationId);

    const userWorkflows = await db
      .select()
      .from(workflows)
      .where(
        and(eq(workflows.userId, session.user.id), isNull(workflows.deletedAt))
      )
      .orderBy(desc(workflows.updatedAt));

    let orgWorkflowRows =
      orgIds.length > 0
        ? await db
            .select()
            .from(workflows)
            .where(
              and(
                inArray(workflows.organizationId, orgIds),
                isNull(workflows.deletedAt)
              )
            )
            .orderBy(desc(workflows.updatedAt))
        : [];

    if (activeOrganizationId) {
      orgWorkflowRows = orgWorkflowRows.filter(
        (workflow) => workflow.organizationId === activeOrganizationId
      );
    }

    const wallet = await db.query.userWallets.findFirst({
      where: eq(userWallets.userId, session.user.id),
    });
    const ownedNames = new Set(userWorkflows.map((workflow) => workflow.name));
    const missingCatalog = CATALOG_TEMPLATE_NAMES.some(
      (name) => !ownedNames.has(name)
    );

    let rows = userWorkflows;
    if (wallet && missingCatalog) {
      try {
        await cloneCatalogTemplatesForUser(session.user.id);
        rows = await db
          .select()
          .from(workflows)
          .where(
            and(
              eq(workflows.userId, session.user.id),
              isNull(workflows.deletedAt)
            )
          )
          .orderBy(desc(workflows.updatedAt));
      } catch (error) {
        console.error("Failed to clone catalog workflows:", error);
      }
    }

    const mapRow = (workflow: (typeof userWorkflows)[number]) => {
      const isOwner = workflow.userId === session.user.id;
      const canEdit =
        isOwner ||
        (Boolean(workflow.organizationId) &&
          workflow.organizationId === activeOrganizationId &&
          activeOrgRole !== null &&
          hasMinimumOrgRole(activeOrgRole, "admin"));
      return {
        ...workflow,
        createdAt: toIso(workflow.createdAt) ?? new Date().toISOString(),
        updatedAt: toIso(workflow.updatedAt) ?? new Date().toISOString(),
        listedAt: toIso(workflow.listedAt),
        deletedAt: toIso(workflow.deletedAt),
        isOwner,
        canEdit,
      };
    };

    const personal = rows
      .filter(
        (workflow) =>
          !workflow.organizationId ||
          (activeOrganizationId &&
            workflow.organizationId !== activeOrganizationId)
      )
      .map(mapRow);

    const organization = orgWorkflowRows.map(mapRow);

    return NextResponse.json(
      { personal, organization, workflows: [...personal, ...organization] },
      { headers: noStore }
    );
  } catch (error) {
    console.error("Failed to get workflows:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get workflows",
      },
      { status: 500, headers: noStore }
    );
  }
}
