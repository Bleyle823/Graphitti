import { and, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mintApiKey } from "@/lib/auth/api-key-mint";
import { db } from "@/lib/db";
import { apiKeys, member } from "@/lib/db/schema";
import { isAnonymousUserId } from "@/lib/is-anonymous";
import { hasMinimumOrgRole } from "@/lib/org/member-role";

const ALLOWED_SCOPES = [
  "workflows:*",
  "marketplace:*",
  "wallet:read",
  "treasury:read",
  "treasury:write",
  "treasury:approve",
] as const;

type CreateKeyBody = {
  name?: string | null;
  organizationId?: string | null;
  scopes?: string[] | null;
};

function normalizeRequestedScopes(raw: string[] | null | undefined): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  return raw.filter((scope) =>
    ALLOWED_SCOPES.includes(scope as (typeof ALLOWED_SCOPES)[number])
  );
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberships = await db.query.member.findMany({
      where: eq(member.userId, session.user.id),
    });
    const adminOrgIds = memberships
      .filter((row) => hasMinimumOrgRole(row.role, "admin"))
      .map((row) => row.organizationId);

    const keys = await db.query.apiKeys.findMany({
      where:
        adminOrgIds.length > 0
          ? or(
              eq(apiKeys.userId, session.user.id),
              inArray(apiKeys.organizationId, adminOrgIds)
            )
          : eq(apiKeys.userId, session.user.id),
      columns: {
        id: true,
        name: true,
        keyPrefix: true,
        organizationId: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return NextResponse.json(keys);
  } catch (error) {
    console.error("Failed to list API keys:", error);
    return NextResponse.json(
      { error: "Failed to list API keys" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const anonymous = await isAnonymousUserId(session.user.id);

    if (anonymous) {
      return NextResponse.json(
        { error: "Connect a wallet before creating API keys" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as CreateKeyBody;
    const name = body.name || null;
    const organizationId = body.organizationId?.trim() || null;
    const scopes = normalizeRequestedScopes(body.scopes);

    if (organizationId) {
      const membership = await db.query.member.findFirst({
        where: and(
          eq(member.organizationId, organizationId),
          eq(member.userId, session.user.id)
        ),
      });
      if (!hasMinimumOrgRole(membership?.role, "admin")) {
        return NextResponse.json(
          { error: "Only owners and admins can create org API keys" },
          { status: 403 }
        );
      }
    }

    const minted = mintApiKey(organizationId ? "organization" : "personal");

    const [newKey] = await db
      .insert(apiKeys)
      .values({
        userId: session.user.id,
        organizationId,
        name,
        keyHash: minted.hash,
        keyPrefix: minted.prefix,
        scopes: scopes.length > 0 ? scopes : null,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        organizationId: apiKeys.organizationId,
        scopes: apiKeys.scopes,
        createdAt: apiKeys.createdAt,
      });

    return NextResponse.json({
      ...newKey,
      key: minted.key,
    });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
