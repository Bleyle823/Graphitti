CREATE TABLE "user_wallets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"privy_user_id" text,
	"privy_wallet_id" text NOT NULL,
	"address" text NOT NULL,
	"chain_type" text DEFAULT 'ethereum' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" text NOT NULL,
	"caller" text,
	"amount_usdc" numeric NOT NULL,
	"payment_hash" text NOT NULL,
	"tx_hash" text,
	"chain" text DEFAULT 'arc-testnet' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "is_listed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "listed_slug" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "listed_at" timestamp;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "listing_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "input_schema" jsonb;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "output_mapping" jsonb;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "price_usdc_per_call" numeric;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "workflow_type" text DEFAULT 'read' NOT NULL;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "chain" text;--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_payments" ADD CONSTRAINT "workflow_payments_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_wallets_privy_wallet" ON "user_wallets" USING btree ("privy_wallet_id");--> statement-breakpoint
CREATE INDEX "idx_user_wallets_user_id" ON "user_wallets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workflow_payments_hash" ON "workflow_payments" USING btree ("payment_hash");--> statement-breakpoint
CREATE INDEX "idx_workflow_payments_workflow" ON "workflow_payments" USING btree ("workflow_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workflows_listed_slug" ON "workflows" USING btree ("listed_slug") WHERE "workflows"."listed_slug" is not null;--> statement-breakpoint
CREATE INDEX "idx_workflows_user_id" ON "workflows" USING btree ("user_id");