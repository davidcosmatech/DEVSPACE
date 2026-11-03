ALTER TABLE "projects" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "visibility" varchar(10) DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_user_workspace_idx" ON "projects" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE INDEX "projects_user_visibility_idx" ON "projects" USING btree ("user_id","visibility");