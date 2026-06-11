ALTER TABLE "channels" ADD COLUMN "parent_channel_id" uuid;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "parent_message_id" uuid;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_parent_channel_id_channels_id_fk" FOREIGN KEY ("parent_channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channels" ADD CONSTRAINT "channels_parent_message_id_messages_id_fk" FOREIGN KEY ("parent_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_parent_message_id_idx" ON "channels" USING btree ("parent_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_parent_channel_archived_idx" ON "channels" USING btree ("parent_channel_id","archived_at");