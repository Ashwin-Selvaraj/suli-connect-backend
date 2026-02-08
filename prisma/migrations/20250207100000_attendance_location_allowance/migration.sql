-- Create SULI locations table
CREATE TABLE "suli_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radius_metres" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suli_locations_pkey" PRIMARY KEY ("id")
);

-- Add location and allowance columns to attendance
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "accuracy" DOUBLE PRECISION;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "checkout_latitude" DOUBLE PRECISION;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "checkout_longitude" DOUBLE PRECISION;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "checkout_accuracy" DOUBLE PRECISION;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "checkout_note" TEXT;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "suli_location_id" TEXT;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "allowance_amount" DECIMAL(12,2);
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "allowance_currency" TEXT;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "allowance_type" TEXT;

-- Foreign key for suli_location_id
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_suli_location_id_fkey" 
    FOREIGN KEY ("suli_location_id") REFERENCES "suli_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
