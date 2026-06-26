CREATE TABLE IF NOT EXISTS "member_roles" (
	"server_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_roles_role_id_user_id_pk" PRIMARY KEY("role_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "server_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"permissions" bigint DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"hoist" boolean DEFAULT false NOT NULL,
	"mentionable" boolean DEFAULT false NOT NULL,
	"is_everyone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_roles" ADD CONSTRAINT "member_roles_role_id_server_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."server_roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "server_roles" ADD CONSTRAINT "server_roles_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_roles_server_user_idx" ON "member_roles" USING btree ("server_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "server_roles_server_id_idx" ON "server_roles" USING btree ("server_id");--> statement-breakpoint
-- Сидим базовую роль @everyone для всех существующих серверов (position 0,
-- нулевые права). У новых серверов её создаёт эндпоинт создания сервера.
INSERT INTO "server_roles" ("server_id", "name", "permissions", "position", "is_everyone")
SELECT "id", '@everyone', 0, 0, true FROM "servers"
WHERE NOT EXISTS (
  SELECT 1 FROM "server_roles" r WHERE r."server_id" = "servers"."id" AND r."is_everyone" = true
);