-- AlterTable
ALTER TABLE "users" ADD COLUMN     "displayName" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_displayName_key" ON "users"("displayName");

