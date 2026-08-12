-- CreateEnum
CREATE TYPE "GovernmentType" AS ENUM ('DEMOCRACY', 'MONARCHY', 'DICTATORSHIP', 'REPUBLIC');

-- CreateTable
CREATE TABLE "nations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "capital" TEXT NOT NULL,
    "government" "GovernmentType" NOT NULL,
    "population" BIGINT NOT NULL,
    "territory" INTEGER NOT NULL,
    "gdp" DECIMAL(18,2) NOT NULL,
    "treasury" DECIMAL(18,2) NOT NULL,
    "happiness" INTEGER NOT NULL,
    "stability" INTEGER NOT NULL,
    "technology" INTEGER NOT NULL,
    "militaryPower" INTEGER NOT NULL,
    "infrastructure" INTEGER NOT NULL,
    "emissions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nations_userId_key" ON "nations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "nations_name_key" ON "nations"("name");

-- AddForeignKey
ALTER TABLE "nations" ADD CONSTRAINT "nations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

