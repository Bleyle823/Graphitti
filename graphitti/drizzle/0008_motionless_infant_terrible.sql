CREATE TABLE "org_spend_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"amount_usdc" numeric NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"source" text NOT NULL,
	"ref" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_wallets" ADD COLUMN "daily_spend_cap_usdc" numeric;--> statement-breakpoint
ALTER TABLE "org_spend_reservations" ADD CONSTRAINT "org_spend_reservations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_org_spend_reservations_org" ON "org_spend_reservations" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_org_spend_reservations_ref" ON "org_spend_reservations" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "idx_org_spend_reservations_status" ON "org_spend_reservations" USING btree ("organization_id","status","created_at");