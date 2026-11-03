ALTER TABLE "profiles" ADD COLUMN "github_cache" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "github_cache_updated_at" timestamp with time zone;