-- CreateTable
CREATE TABLE "integration_mappings" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "readyFlag" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_mappings_source_sourceId_idx" ON "integration_mappings"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_mappings_source_sourceId_target_key" ON "integration_mappings"("source", "sourceId", "target");
