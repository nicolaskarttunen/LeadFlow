-- CreateEnum
CREATE TYPE "LeadReviewStatus" AS ENUM ('PENDING', 'KEPT', 'REJECTED');

-- AlterTable
ALTER TABLE "Lead"
ADD COLUMN "reviewStatus" "LeadReviewStatus",
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Lead_workspaceId_reviewStatus_idx" ON "Lead"("workspaceId", "reviewStatus");
