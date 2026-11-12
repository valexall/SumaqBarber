CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
DROP INDEX IF EXISTS "User_role_idx";
DROP INDEX IF EXISTS "User_phone_idx";
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

ALTER TABLE "Service"
  ALTER COLUMN "price" TYPE DECIMAL(10, 2) USING "price"::numeric(10, 2);

ALTER TABLE "Appointment"
  ADD COLUMN "durationMinutes" INTEGER,
  ADD COLUMN "endAt" TIMESTAMPTZ(3),
  ADD COLUMN "priceAtBooking" DECIMAL(10, 2);

UPDATE "Appointment" AS appointment
SET
  "durationMinutes" = service."duration",
  "endAt" = appointment."date" AT TIME ZONE 'America/Lima' + make_interval(mins => service."duration"),
  "priceAtBooking" = service."price"
FROM "Service" AS service
WHERE appointment."serviceId" = service."id";

ALTER TABLE "Appointment"
  ALTER COLUMN "date" TYPE TIMESTAMPTZ(3) USING "date" AT TIME ZONE 'America/Lima',
  ALTER COLUMN "durationMinutes" SET NOT NULL,
  ALTER COLUMN "endAt" SET NOT NULL,
  ALTER COLUMN "priceAtBooking" SET NOT NULL;

DROP INDEX IF EXISTS "Appointment_barberId_date_key";
DROP INDEX IF EXISTS "Appointment_status_idx";

CREATE INDEX "Appointment_barberId_date_status_idx"
  ON "Appointment"("barberId", "date", "status");
CREATE INDEX "Appointment_status_date_idx"
  ON "Appointment"("status", "date");

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_overlapping_active_slots"
  EXCLUDE USING gist (
    "barberId" WITH =,
    tstzrange("date", "endAt", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELED');
