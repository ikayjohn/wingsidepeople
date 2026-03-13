-- Asset register enhancements: business asset code, department snapshot, expected return tracking

ALTER TABLE "Asset"
ADD COLUMN "assetCode" TEXT;

ALTER TABLE "AssetAssignment"
ADD COLUMN "departmentSnapshot" TEXT,
ADD COLUMN "expectedReturnDate" TIMESTAMP(3);

CREATE UNIQUE INDEX "Asset_assetCode_key" ON "Asset"("assetCode");
