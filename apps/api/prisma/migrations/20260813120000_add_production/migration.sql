-- Cria o domínio Produção (CLAUDE.md seção 16).
--
-- Como em Recursos, nada é movido de lugar: é um domínio novo, sem dado antigo
-- para preservar. Os países já existentes recebem uma linha por bem do catálogo,
-- com a mesma alocação inicial de um país novo (production-defaults.ts).

-- CreateEnum
CREATE TYPE "GoodType" AS ENUM ('PLANKS', 'STEEL', 'FUEL');

-- CreateTable
CREATE TABLE "production_lines" (
    "id" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "good" "GoodType" NOT NULL,
    "allocation" INTEGER NOT NULL,
    "producedTotal" BIGINT NOT NULL DEFAULT 0,
    "productionCarryMicro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "production_lines_nationId_good_key" ON "production_lines"("nationId", "good");

-- AddForeignKey
ALTER TABLE "production_lines" ADD CONSTRAINT "production_lines_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "nations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migração de dados: uma linha por bem para cada país existente.
--
-- Diferente dos depósitos, que dependem de um sorteio e por isso ficaram a cargo
-- da aplicação, as linhas são iguais para todo mundo — o SQL aqui não duplica
-- regra alguma, só repete uma constante.
INSERT INTO "production_lines" ("id", "nationId", "good", "allocation", "updatedAt")
SELECT gen_random_uuid()::text, "nations"."id", "good", 30, CURRENT_TIMESTAMP
FROM "nations"
CROSS JOIN unnest(enum_range(NULL::"GoodType")) AS "good";
