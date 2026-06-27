ALTER TABLE "secret_identities" ADD COLUMN "kyber_pre_key_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "secret_identities" ADD COLUMN "kyber_pre_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "secret_identities" ADD COLUMN "kyber_pre_key_sig" text NOT NULL;