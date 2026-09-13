import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { IntegrationType } from "../types/integration";
import { generateId } from "../utils/id";

// Better Auth tables
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // Anonymous user tracking
  isAnonymous: boolean("is_anonymous").default(false),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  activeOrganizationId: text("active_organization_id"),
});

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: timestamp("created_at").notNull(),
  metadata: text("metadata"),
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("member_org_single_owner")
      .on(table.organizationId)
      .where(sql`${table.role} = 'owner'`),
    index("idx_member_user_id").on(table.userId),
    index("idx_member_org_id").on(table.organizationId),
  ]
);

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Workflow visibility type
export type WorkflowVisibility = "private" | "public";

// Workflows table with user association
export const workflows = pgTable(
  "workflows",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    name: text("name").notNull(),
    description: text("description"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    // biome-ignore lint/suspicious/noExplicitAny: JSONB type - structure validated at application level
    nodes: jsonb("nodes").notNull().$type<any[]>(),
    // biome-ignore lint/suspicious/noExplicitAny: JSONB type - structure validated at application level
    edges: jsonb("edges").notNull().$type<any[]>(),
    visibility: text("visibility")
      .notNull()
      .default("private")
      .$type<WorkflowVisibility>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    isListed: boolean("is_listed").default(false).notNull(),
    listedSlug: text("listed_slug"),
    listedAt: timestamp("listed_at"),
    listingVersion: integer("listing_version").notNull().default(1),
    inputSchema: jsonb("input_schema").$type<Record<string, unknown>>(),
    outputMapping: jsonb("output_mapping").$type<Record<string, unknown>>(),
    priceUsdcPerCall: numeric("price_usdc_per_call"),
    workflowType: text("workflow_type")
      .$type<"read" | "write">()
      .default("read")
      .notNull(),
    category: text("category"),
    chain: text("chain"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("idx_workflows_listed_slug")
      .on(table.listedSlug)
      .where(sql`${table.listedSlug} is not null`),
    index("idx_workflows_user_id").on(table.userId),
    index("idx_workflows_org_id").on(table.organizationId),
  ]
);

export const organizationWallets = pgTable(
  "organization_wallets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    privyWalletId: text("privy_wallet_id").notNull(),
    address: text("address").notNull(),
    privyOrganizationId: text("privy_organization_id"),
    ownerQuorumId: text("owner_quorum_id"),
    operatorSignerId: text("operator_signer_id"),
    autoPolicyId: text("auto_policy_id"),
    humanPolicyId: text("human_policy_id"),
    autoSpendCapUsdc: numeric("auto_spend_cap_usdc").notNull().default("10"),
    dailySpendCapUsdc: numeric("daily_spend_cap_usdc"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("organization_wallets_org_active_unique")
      .on(table.organizationId)
      .where(sql`${table.isActive} = true`),
    uniqueIndex("idx_org_wallets_privy_wallet").on(table.privyWalletId),
  ]
);

export const organizationPayees = pgTable(
  "organization_payees",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    address: text("address").notNull(),
    defaultAmountUsdc: numeric("default_amount_usdc"),
    chain: text("chain").notNull().default("base_sepolia"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_org_payees_org").on(table.organizationId),
    uniqueIndex("idx_org_payees_org_address").on(
      table.organizationId,
      table.address
    ),
  ]
);

export const orgSpendReservations = pgTable(
  "org_spend_reservations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    amountUsdc: numeric("amount_usdc").notNull(),
    status: text("status")
      .notNull()
      .default("reserved")
      .$type<"reserved" | "settled" | "released">(),
    source: text("source").notNull(),
    ref: text("ref").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_org_spend_reservations_org").on(table.organizationId),
    uniqueIndex("idx_org_spend_reservations_ref").on(table.ref),
    index("idx_org_spend_reservations_status").on(
      table.organizationId,
      table.status,
      table.createdAt
    ),
  ]
);

export const userWallets = pgTable(
  "user_wallets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    privyUserId: text("privy_user_id"),
    privyWalletId: text("privy_wallet_id").notNull(),
    address: text("address").notNull(),
    chainType: text("chain_type").notNull().default("ethereum"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_wallets_privy_wallet").on(table.privyWalletId),
    index("idx_user_wallets_user_id").on(table.userId),
  ]
);

export const workflowPayments = pgTable(
  "workflow_payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id),
    caller: text("caller"),
    amountUsdc: numeric("amount_usdc").notNull(),
    paymentHash: text("payment_hash").notNull(),
    txHash: text("tx_hash"),
    chain: text("chain").notNull().default("arc-testnet"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_workflow_payments_hash").on(table.paymentHash),
    index("idx_workflow_payments_workflow").on(table.workflowId),
  ]
);

// Integrations table for storing user credentials
export const integrations = pgTable("integrations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull().$type<IntegrationType>(),
  // biome-ignore lint/suspicious/noExplicitAny: JSONB type - encrypted credentials stored as JSON
  config: jsonb("config").notNull().$type<any>(),
  // Whether this integration was created via OAuth (managed by app) vs manual entry
  isManaged: boolean("is_managed").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Workflow executions table to track workflow runs
export const workflowExecutions = pgTable("workflow_executions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  workflowId: text("workflow_id")
    .notNull()
    .references(() => workflows.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status")
    .notNull()
    .$type<"pending" | "running" | "success" | "error" | "cancelled">(),
  // biome-ignore lint/suspicious/noExplicitAny: JSONB type - structure validated at application level
  input: jsonb("input").$type<Record<string, any>>(),
  // biome-ignore lint/suspicious/noExplicitAny: JSONB type - structure validated at application level
  output: jsonb("output").$type<any>(),
  error: text("error"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: text("duration"), // Duration in milliseconds
});

export const organizationIntents = pgTable(
  "organization_intents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    privyIntentId: text("privy_intent_id").notNull(),
    workflowExecutionId: text("workflow_execution_id").references(
      () => workflowExecutions.id,
      { onDelete: "set null" }
    ),
    amountUsdc: numeric("amount_usdc"),
    toAddress: text("to_address"),
    status: text("status")
      .notNull()
      .default("pending")
      .$type<
        | "pending"
        | "processing"
        | "executed"
        | "failed"
        | "expired"
        | "rejected"
        | "dismissed"
      >(),
    txHash: text("tx_hash"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_org_intents_privy_intent").on(table.privyIntentId),
    index("idx_org_intents_org").on(table.organizationId),
    index("idx_org_intents_execution").on(table.workflowExecutionId),
  ]
);

// Workflow execution logs to track individual node executions
export const workflowExecutionLogs = pgTable("workflow_execution_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  executionId: text("execution_id")
    .notNull()
    .references(() => workflowExecutions.id),
  nodeId: text("node_id").notNull(),
  nodeName: text("node_name").notNull(),
  nodeType: text("node_type").notNull(),
  status: text("status")
    .notNull()
    .$type<"pending" | "running" | "success" | "error">(),
  // biome-ignore lint/suspicious/noExplicitAny: JSONB type - structure validated at application level
  input: jsonb("input").$type<any>(),
  // biome-ignore lint/suspicious/noExplicitAny: JSONB type - structure validated at application level
  output: jsonb("output").$type<any>(),
  error: text("error"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: text("duration"), // Duration in milliseconds
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// API Keys table for webhook authentication
export const apiKeys = pgTable("api_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade",
  }),
  name: text("name"), // Optional label for the API key
  keyHash: text("key_hash").notNull(), // Store hashed version of the key
  keyPrefix: text("key_prefix").notNull(), // Store first few chars for display (e.g., "wf_abc...")
  scopes: jsonb("scopes").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

// Relations
export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  wallets: many(organizationWallets),
  payees: many(organizationPayees),
  intents: many(organizationIntents),
  spendReservations: many(orgSpendReservations),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(users, {
    fields: [member.userId],
    references: [users.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(users, {
    fields: [invitation.inviterId],
    references: [users.id],
  }),
}));

export const workflowExecutionsRelations = relations(
  workflowExecutions,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowExecutions.workflowId],
      references: [workflows.id],
    }),
  })
);

export const orgSpendReservationRelations = relations(
  orgSpendReservations,
  ({ one }) => ({
    organization: one(organization, {
      fields: [orgSpendReservations.organizationId],
      references: [organization.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
export type WorkflowExecutionLog = typeof workflowExecutionLogs.$inferSelect;
export type NewWorkflowExecutionLog = typeof workflowExecutionLogs.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type UserWallet = typeof userWallets.$inferSelect;
export type NewUserWallet = typeof userWallets.$inferInsert;
export type WorkflowPayment = typeof workflowPayments.$inferSelect;
export type NewWorkflowPayment = typeof workflowPayments.$inferInsert;
export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;
export type Invitation = typeof invitation.$inferSelect;
export type NewInvitation = typeof invitation.$inferInsert;
export type OrganizationWallet = typeof organizationWallets.$inferSelect;
export type NewOrganizationWallet = typeof organizationWallets.$inferInsert;
export type OrganizationPayee = typeof organizationPayees.$inferSelect;
export type NewOrganizationPayee = typeof organizationPayees.$inferInsert;
export type OrganizationIntent = typeof organizationIntents.$inferSelect;
export type NewOrganizationIntent = typeof organizationIntents.$inferInsert;
export type OrgSpendReservation = typeof orgSpendReservations.$inferSelect;
export type NewOrgSpendReservation = typeof orgSpendReservations.$inferInsert;
