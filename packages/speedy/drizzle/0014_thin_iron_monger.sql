CREATE TABLE IF NOT EXISTS "channel_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "channel_categories" ADD CONSTRAINT "channel_categories_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channel_categories_server_id_idx" ON "channel_categories" USING btree ("server_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "channel_categories_server_name_unique_idx" ON "channel_categories" USING btree ("server_id","name");--> statement-breakpoint
-- Бэкфилл: категории-метки существующих каналов становятся строками таблицы.
-- Позиция = минимальная позиция канала в категории, чтобы сохранить порядок.
INSERT INTO "channel_categories" ("server_id", "name", "position")
SELECT "server_id", "category", MIN("position")
FROM "channels"
WHERE "category" IS NOT NULL AND "server_id" IS NOT NULL
GROUP BY "server_id", "category"
ON CONFLICT DO NOTHING;