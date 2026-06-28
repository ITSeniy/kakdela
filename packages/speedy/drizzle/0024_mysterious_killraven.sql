CREATE TABLE IF NOT EXISTS "gif_favorites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"gif_url" text NOT NULL,
	"mp4_url" text,
	"preview_url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "gif" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gif_favorites" ADD CONSTRAINT "gif_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gif_favorites_user_created_idx" ON "gif_favorites" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gif_favorites_user_gif_unique_idx" ON "gif_favorites" USING btree ("user_id","gif_url");