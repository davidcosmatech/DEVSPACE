CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(254),
	"action" varchar(60) NOT NULL,
	"target_type" varchar(30) NOT NULL,
	"target_id" varchar(64),
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(40) NOT NULL,
	"name" varchar(60) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_unique" ON "roles" USING btree ("key");--> statement-breakpoint
INSERT INTO "roles" ("key", "name", "description", "permissions", "is_system") VALUES
	('owner', 'Owner', 'Full control of the workspace, including role management and ownership transfer.', '["dashboard.view","analytics.view","users.manage","roles.manage","content.manage","support.manage","settings.manage"]'::jsonb, true),
	('admin', 'Admin', 'Administers people, roles, content and support requests.', '["dashboard.view","analytics.view","users.manage","roles.manage","content.manage","support.manage","settings.manage"]'::jsonb, true),
	('moderator', 'Moderator', 'Manages people, support requests and content; cannot change roles.', '["dashboard.view","analytics.view","users.manage","content.manage","support.manage"]'::jsonb, true),
	('editor', 'Editor', 'Creates and edits workspace content.', '["dashboard.view","content.manage"]'::jsonb, true),
	('member', 'Member', 'Standard workspace member with content access.', '["dashboard.view","content.manage"]'::jsonb, true),
	('viewer', 'Viewer', 'Read-only workspace access.', '["dashboard.view"]'::jsonb, true)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET DATA TYPE varchar(40);--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
UPDATE "profiles" SET "role" = 'member' WHERE "role" = 'user';--> statement-breakpoint
UPDATE "profiles" SET "role" = 'owner' WHERE "role" = 'admin';--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_roles_key_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");
