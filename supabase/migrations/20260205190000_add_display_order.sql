ALTER TABLE "public"."tasks" ADD COLUMN "display_order" double precision;

-- Initialize display_order based on created_at (EPOCH) to maintain current order
UPDATE "public"."tasks"
SET "display_order" = EXTRACT(EPOCH FROM created_at);
