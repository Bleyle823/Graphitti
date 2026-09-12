import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { member, type Workflow } from "@/lib/db/schema";
import { hasMinimumOrgRole, type OrgRole } from "@/lib/org/member-role";

export type WorkflowAccessAction =
  | "read"
  | "update"
  | "delete"
  | "execute"
  | "duplicate";

export type WorkflowAccessResult =
  | {
      allowed: true;
      isOwner: boolean;
      orgRole: OrgRole | null;
    }
  | { allowed: false; reason: string };

async function getOrgMembershipRole(
  userId: string,
  organizationId: string
): Promise<OrgRole | null> {
  const row = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.userId, userId)
    ),
  });
  if (!(row?.role && hasMinimumOrgRole(row.role, "member"))) {
    return null;
  }
  return row.role as OrgRole;
}

export async function resolveWorkflowAccess(
  userId: string,
  workflow: Pick<Workflow, "userId" | "organizationId">,
  action: WorkflowAccessAction
): Promise<WorkflowAccessResult> {
  const isOwner = workflow.userId === userId;

  if (isOwner) {
    return { allowed: true, isOwner: true, orgRole: null };
  }

  const orgId = workflow.organizationId;
  if (!orgId) {
    return { allowed: false, reason: "Not authorized" };
  }

  const orgRole = await getOrgMembershipRole(userId, orgId);
  if (!orgRole) {
    return { allowed: false, reason: "Not a member of this organization" };
  }

  switch (action) {
    case "read":
    case "execute":
    case "duplicate":
      return { allowed: true, isOwner: false, orgRole };

    case "update":
    case "delete":
      if (hasMinimumOrgRole(orgRole, "admin")) {
        return { allowed: true, isOwner: false, orgRole };
      }
      return {
        allowed: false,
        reason: "Insufficient role to modify this workflow",
      };

    default:
      return { allowed: false, reason: "Not authorized" };
  }
}

export async function canReadWorkflow(
  userId: string,
  workflow: Pick<Workflow, "userId" | "organizationId">
): Promise<boolean> {
  const result = await resolveWorkflowAccess(userId, workflow, "read");
  return result.allowed;
}
