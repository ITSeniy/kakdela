CREATE TYPE "public"."favorite_kind" AS ENUM('gif', 'sticker', 'emoji');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "favorites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "favorite_kind" NOT NULL,
	"ref_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "favorites_user_kind_created_idx" ON "favorites" USING btree ("user_id","kind","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_kind_ref_unique_idx" ON "favorites" USING btree ("user_id","kind","ref_key");