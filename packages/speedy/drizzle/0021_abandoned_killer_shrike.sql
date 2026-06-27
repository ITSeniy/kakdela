CREATE TYPE "public"."secret_msg_type" AS ENUM('prekey', 'message');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "secret_envelopes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"ciphertext" "bytea" NOT NULL,
	"msg_type" "secret_msg_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "secret_identities" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"identity_key" text NOT NULL,
	"registration_id" integer NOT NULL,
	"signed_pre_key_id" integer NOT NULL,
	"signed_pre_key" text NOT NULL,
	"signed_pre_key_sig" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "secret_one_time_prekeys" (
	"user_id" uuid NOT NULL,
	"key_id" integer NOT NULL,
	"pub_key" text NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "secret_one_time_prekeys_user_id_key_id_pk" PRIMARY KEY("user_id","key_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "secret_envelopes" ADD CONSTRAINT "secret_envelopes_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "secret_envelopes" ADD CONSTRAINT "secret_envelopes_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "secret_identities" ADD CONSTRAINT "secret_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "secret_one_time_prekeys" ADD CONSTRAINT "secret_one_time_prekeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "secret_envelopes_to_user_id_idx" ON "secret_envelopes" USING btree ("to_user_id","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "secret_one_time_prekeys_available_idx" ON "secret_one_time_prekeys" USING btree ("user_id","consumed_at");