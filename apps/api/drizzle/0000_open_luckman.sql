CREATE TABLE "examples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "examples_name_unique" UNIQUE("name"),
	CONSTRAINT "examples_name_not_blank" CHECK (length(trim("examples"."name")) > 0)
);
--> statement-breakpoint
CREATE INDEX "examples_created_at_idx" ON "examples" USING btree ("created_at");