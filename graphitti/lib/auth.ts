import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, genericOAuth, organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { eq } from "drizzle-orm";
import { isAiGatewayManagedKeysEnabled } from "./ai-gateway/config";
import { db } from "./db";
import {
  accounts,
  integrations,
  invitation,
  member,
  organization as organizationTable,
  sessions,
  users,
  verifications,
  workflowExecutionLogs,
  workflowExecutions,
  workflowExecutionsRelations,
  workflows,
} from "./db/schema";
import { sendOrganizationInvitationEmail } from "./email/send-organization-invitation";
import { bindOrgWalletToMemberWorkflows } from "./privy/bind-org-wallet-workflows";
import { ensureOrgTreasury } from "./privy/ensure-org-treasury";

const statement = {
  workflow: ["create", "read", "update", "delete"],
  credential: ["create", "read", "update", "delete"],
  wallet: ["create", "read", "update", "delete"],
  organization: ["read", "update", "delete"],
  member: ["create", "read", "update", "delete"],
  invitation: ["create", "cancel"],
} as const;

const ac = createAccessControl(statement);

const memberRole = ac.newRole({
  workflow: ["create", "read", "update", "delete"],
  credential: ["read"],
  wallet: ["read"],
  organization: ["read"],
  member: ["read"],
});

const adminRole = ac.newRole({
  workflow: ["create", "read", "update", "delete"],
  credential: ["create", "read", "update", "delete"],
  wallet: ["create", "read", "update", "delete"],
  organization: ["update"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

const ownerRole = ac.newRole({
  workflow: ["create", "read", "update", "delete"],
  credential: ["create", "read", "update", "delete"],
  wallet: ["create", "read", "update", "delete"],
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

// Construct schema object for drizzle adapter
const schema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  organization: organizationTable,
  member,
  invitation,
  workflows,
  workflowExecutions,
  workflowExecutionLogs,
  workflowExecutionsRelations,
};

function isLocalhostUrl(value: string): boolean {
  try {
    const host = new URL(value.includes("://") ? value : `https://${value}`)
      .hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /localhost|127\.0\.0\.1|::1/i.test(value);
  }
}

function withHttps(hostOrUrl: string): string {
  if (hostOrUrl.startsWith("http://") || hostOrUrl.startsWith("https://")) {
    return hostOrUrl.replace(/\/$/, "");
  }
  return `https://${hostOrUrl.replace(/\/$/, "")}`;
}

// Determine the base URL for authentication
// This supports Vercel Preview deployments with dynamic URLs
function getBaseURL(): string {
  const envUrl = process.env.BETTER_AUTH_URL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelUrl = process.env.VERCEL_URL;

  // A leftover localhost BETTER_AUTH_URL in Vercel env would reject every
  // production Origin and surface "Invalid origin" on anonymous sign-in.
  if (process.env.VERCEL) {
    if (envUrl && !isLocalhostUrl(envUrl)) {
      return envUrl.replace(/\/$/, "");
    }
    if (appUrl && !isLocalhostUrl(appUrl)) {
      return appUrl.replace(/\/$/, "");
    }
    if (process.env.VERCEL_ENV === "production" && vercelProduction) {
      return withHttps(vercelProduction);
    }
    if (vercelUrl) {
      return withHttps(vercelUrl);
    }
  }

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  if (appUrl) {
    return appUrl.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

function getTrustedOrigins(): string[] {
  const origins = new Set<string>([
    getBaseURL(),
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://graphitti-five.vercel.app",
  ]);

  const extras = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? withHttps(process.env.VERCEL_URL) : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL)
      : undefined,
  ];
  for (const extra of extras) {
    if (extra) {
      origins.add(extra.replace(/\/$/, ""));
    }
  }
  for (const extra of (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(
    ","
  )) {
    const trimmed = extra.trim().replace(/\/$/, "");
    if (trimmed) {
      origins.add(trimmed);
    }
  }
  if (process.env.NODE_ENV === "development") {
    origins.add("https://localhost:*");
    origins.add("https://127.0.0.1:*");
  }
  return [...origins];
}

async function provisionOrganizationTreasury(input: {
  organizationId: string;
  organizationName: string;
  creatorUserId: string;
}) {
  await ensureOrgTreasury(input);
}

// Build plugins array conditionally
const plugins = [
  anonymous({
    async onLinkAccount(data) {
      // When an anonymous user links to a real account, migrate their data
      const fromUserId = data.anonymousUser.user.id;
      const toUserId = data.newUser.user.id;

      console.log(
        `[Anonymous Migration] Migrating from user ${fromUserId} to ${toUserId}`
      );

      try {
        // Migrate workflows
        await db
          .update(workflows)
          .set({ userId: toUserId })
          .where(eq(workflows.userId, fromUserId));

        // Migrate workflow executions
        await db
          .update(workflowExecutions)
          .set({ userId: toUserId })
          .where(eq(workflowExecutions.userId, fromUserId));

        // Migrate integrations
        await db
          .update(integrations)
          .set({ userId: toUserId })
          .where(eq(integrations.userId, fromUserId));

        console.log(
          `[Anonymous Migration] Successfully migrated data from ${fromUserId} to ${toUserId}`
        );
      } catch (error) {
        console.error(
          "[Anonymous Migration] Error migrating user data:",
          error
        );
        throw error;
      }
    },
  }),
  organization({
    ac,
    roles: {
      owner: ownerRole,
      admin: adminRole,
      member: memberRole,
    },
    async sendInvitationEmail(data) {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? getBaseURL();
      await sendOrganizationInvitationEmail({
        to: data.email,
        inviterName: data.inviter.user.name,
        orgName: data.organization.name,
        acceptUrl: `${base}/accept-invitation?invitationId=${data.id}`,
      });
    },
    organizationHooks: {
      async afterCreateOrganization(data) {
        const creatorUserId = data.user?.id ?? data.member?.userId;
        if (!creatorUserId) {
          return;
        }
        await provisionOrganizationTreasury({
          organizationId: data.organization.id,
          organizationName: data.organization.name,
          creatorUserId,
        });
      },
      async afterAddMember(data) {
        await bindOrgWalletToMemberWorkflows(data.organization.id);
      },
    },
  }),
  ...(process.env.VERCEL_CLIENT_ID
    ? [
        genericOAuth({
          config: [
            {
              providerId: "vercel",
              clientId: process.env.VERCEL_CLIENT_ID,
              clientSecret: process.env.VERCEL_CLIENT_SECRET || "",
              authorizationUrl: "https://vercel.com/oauth/authorize",
              tokenUrl: "https://api.vercel.com/login/oauth/token",
              userInfoUrl: "https://api.vercel.com/login/oauth/userinfo",
              // Include read-write:team scope when AI Gateway User Keys is enabled
              // This grants APIKey and APIKeyAiGateway permissions for creating user keys
              scopes: isAiGatewayManagedKeysEnabled()
                ? ["openid", "email", "profile", "read-write:team"]
                : ["openid", "email", "profile"],
              discoveryUrl: undefined,
              pkce: true,
              getUserInfo: async (tokens) => {
                const response = await fetch(
                  "https://api.vercel.com/login/oauth/userinfo",
                  {
                    headers: {
                      Authorization: `Bearer ${tokens.accessToken}`,
                    },
                  }
                );
                const profile = await response.json();
                console.log("[Vercel OAuth] userinfo response:", profile);
                return {
                  id: profile.sub,
                  email: profile.email,
                  name: profile.name ?? profile.preferred_username,
                  emailVerified: profile.email_verified ?? true,
                  image: profile.picture,
                };
              },
            },
          ],
        }),
      ]
    : []),
];

export const auth = betterAuth({
  baseURL: getBaseURL(),
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  user: {
    additionalFields: {
      isAnonymous: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled: !!process.env.GITHUB_CLIENT_ID,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  plugins,
});
