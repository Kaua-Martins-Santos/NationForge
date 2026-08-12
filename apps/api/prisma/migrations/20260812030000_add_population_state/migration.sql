-- Move o número de habitantes de `nations.population` para o novo domínio
-- População, que passa a ser seu dono único.
--
-- A ordem importa: criamos a tabela, COPIAMOS os dados dos países existentes e
-- só então removemos a coluna antiga. Dropar a coluna antes descartaria a
-- população de todo país já criado.

-- CreateTable
CREATE TABLE "population_states" (
    "id" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "total" BIGINT NOT NULL,
    "birthRatePerThousand" INTEGER NOT NULL,
    "deathRatePerThousand" INTEGER NOT NULL,
    "health" INTEGER NOT NULL,
    "education" INTEGER NOT NULL,
    "simulatedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "population_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "population_states_nationId_key" ON "population_states"("nationId");

-- AddForeignKey
ALTER TABLE "population_states" ADD CONSTRAINT "population_states_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "nations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migração de dados: cada país existente ganha seu estado demográfico, herdando
-- a população que já tinha. Os demais campos recebem os mesmos valores iniciais
-- que um país novo receberia (ver population-defaults.ts).
INSERT INTO "population_states" (
    "id", "nationId", "total",
    "birthRatePerThousand", "deathRatePerThousand",
    "health", "education",
    "simulatedUntil", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    "id",
    "population",
    18, 8,
    50, 10,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "nations";

-- AlterTable
ALTER TABLE "nations" DROP COLUMN "population";
