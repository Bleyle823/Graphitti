ALTER TABLE "api_keys" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "scopes" jsonb;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;