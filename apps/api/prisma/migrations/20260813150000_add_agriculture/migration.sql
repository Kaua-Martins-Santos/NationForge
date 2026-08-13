-- Cria o domínio Agricultura (CLAUDE.md seção 15).
--
-- Domínio novo, sem dado antigo para preservar. Os países já existentes recebem
-- o mesmo estado inicial de um país novo (agriculture-defaults.ts) — sem isso
-- ficariam sem `agricultureState` e a leitura do país falharia.

-- CreateTable
CREATE TABLE "agriculture_states" (
    "id" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "farmlandShare" INTEGER NOT NULL,
    "foodStock" BIGINT NOT NULL,
    "foodCarryMicro" INTEGER NOT NULL DEFAULT 0,
    "weatherSeed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agriculture_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agriculture_states_nationId_key" ON "agriculture_states"("nationId");

-- AddForeignKey
ALTER TABLE "agriculture_states" ADD CONSTRAINT "agriculture_states_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "nations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migração de dados: cada país existente ganha lavoura, estoque e uma semente de
-- clima própria. Os valores repetem as constantes de agriculture-defaults.ts —
-- não há regra duplicada aqui, só números.
INSERT INTO "agriculture_states" ("id", "nationId", "farmlandShare", "foodStock", "weatherSeed", "updatedAt")
SELECT gen_random_uuid()::text, "id", 35, 250000, floor(random() * 2147483647)::int, CURRENT_TIMESTAMP
FROM "nations";
