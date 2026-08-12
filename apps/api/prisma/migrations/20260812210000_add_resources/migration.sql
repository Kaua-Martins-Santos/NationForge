-- Cria o domínio Recursos (CLAUDE.md seção 14).
--
-- Diferente das migrations anteriores, nada é movido de lugar aqui: recursos são
-- um domínio novo, sem dado antigo para preservar. Os países já existentes
-- recebem um estado de recursos com dotação sorteada — sem isso, ficariam sem
-- `resourceState` e a leitura do país falharia.

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('IRON', 'OIL', 'COAL', 'GOLD', 'TIMBER', 'WATER', 'NATURAL_GAS', 'URANIUM');

-- AlterTable: resto fracionário das emissões, que agora se movem.
ALTER TABLE "nations" ADD COLUMN "emissionsCarryMicro" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "resource_states" (
    "id" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "extractionRate" INTEGER NOT NULL,
    "seed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_deposits" (
    "id" TEXT NOT NULL,
    "resourceStateId" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "reserves" BIGINT NOT NULL,
    "extractedTotal" BIGINT NOT NULL DEFAULT 0,
    "extractionCarryMicro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_states_nationId_key" ON "resource_states"("nationId");

-- CreateIndex
CREATE UNIQUE INDEX "resource_deposits_resourceStateId_type_key" ON "resource_deposits"("resourceStateId", "type");

-- AddForeignKey
ALTER TABLE "resource_states" ADD CONSTRAINT "resource_states_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "nations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_deposits" ADD CONSTRAINT "resource_deposits_resourceStateId_fkey" FOREIGN KEY ("resourceStateId") REFERENCES "resource_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migração de dados: todo país existente ganha seu estado de recursos, com a
-- mesma intensidade inicial que um país novo receberia (resource-defaults.ts).
-- A semente é sorteada aqui; a dotação em si é gerada pela aplicação.
INSERT INTO "resource_states" ("id", "nationId", "extractionRate", "seed", "updatedAt")
SELECT gen_random_uuid()::text, "id", 40, floor(random() * 2147483647)::int, CURRENT_TIMESTAMP
FROM "nations";

-- Os depósitos dos países existentes ficam a cargo da aplicação: a regra de
-- sorteio vive em resource-endowment.ts e replicá-la em SQL criaria uma segunda
-- versão dela, fadada a divergir. Um país sem depósito é um estado válido —
-- apenas não extrai nada até ganhar um.
