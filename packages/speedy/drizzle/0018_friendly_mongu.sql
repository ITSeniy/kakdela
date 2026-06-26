ALTER TABLE "channels" ADD COLUMN "slow_mode_sec" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "auto_delete_sec" integer;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "friends_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "nsfw" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "threads_allowed" boolean DEFAULT true NOT NULL;