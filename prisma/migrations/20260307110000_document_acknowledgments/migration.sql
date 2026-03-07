CREATE TABLE IF NOT EXISTS "DocumentAcknowledgment" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAcknowledgment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentAcknowledgment_documentId_userId_key"
ON "DocumentAcknowledgment"("documentId", "userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAcknowledgment_documentId_fkey') THEN
    ALTER TABLE "DocumentAcknowledgment"
    ADD CONSTRAINT "DocumentAcknowledgment_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DocumentAcknowledgment_userId_fkey') THEN
    ALTER TABLE "DocumentAcknowledgment"
    ADD CONSTRAINT "DocumentAcknowledgment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
