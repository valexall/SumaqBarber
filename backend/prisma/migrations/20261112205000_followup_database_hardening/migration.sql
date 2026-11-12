CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension extension
    JOIN pg_namespace namespace ON namespace.oid = extension.extnamespace
    WHERE extension.extname = 'btree_gist'
      AND namespace.nspname <> 'extensions'
  ) THEN
    ALTER EXTENSION btree_gist SET SCHEMA extensions;
  END IF;
END
$$;

CREATE INDEX "Appointment_serviceId_idx" ON "Appointment"("serviceId");
