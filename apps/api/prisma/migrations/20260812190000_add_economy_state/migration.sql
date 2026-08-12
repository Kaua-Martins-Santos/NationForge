-- Cria o domínio Economia e move o marco temporal da simulação para a nação.
--
-- Três mudanças relacionadas, nesta ordem, sempre COPIANDO os dados antes de
-- remover a coluna de origem:
--
-- 1. `simulatedUntil` sai de population_states e vai para nations. O tempo é do
--    país inteiro: população e economia avançam no mesmo laço de ticks, e um
--    marco por domínio permitiria que saíssem de sincronia.
-- 2. `treasury` sai de nations e vira `treasuryCents` em economy_states —
--    BigInt de centavos em vez de Decimal, porque os ticks fazem milhares de
--    somas e aritmética inteira é exata por construção.
-- 3. `gdp` deixa de ser persistido: passa a ser derivado da força de trabalho e
--    da produtividade a cada leitura, como já acontece com o emprego.

-- Passo 1: o marco temporal vai para nations, herdando o valor que o domínio
-- População já mantinha. Países sem estado demográfico (não deveria haver)
-- caem para a data de criação, que é o marco correto para um país que nunca
-- foi simulado.
ALTER TABLE "nations" ADD COLUMN "simulatedUntil" TIMESTAMP(3);

UPDATE "nations"
SET "simulatedUntil" = "population_states"."simulatedUntil"
FROM "population_states"
WHERE "population_states"."nationId" = "nations"."id";

UPDATE "nations"
SET "simulatedUntil" = "createdAt"
WHERE "simulatedUntil" IS NULL;

ALTER TABLE "nations" ALTER COLUMN "simulatedUntil" SET NOT NULL;

ALTER TABLE "population_states" DROP COLUMN "simulatedUntil";

-- Passo 2: a nova tabela do domínio Economia.
CREATE TABLE "economy_states" (
    "id" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "treasuryCents" BIGINT NOT NULL,
    "treasuryCarryMicro" INTEGER NOT NULL DEFAULT 0,
    "taxRate" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "economy_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "economy_states_nationId_key" ON "economy_states"("nationId");

-- AddForeignKey
ALTER TABLE "economy_states" ADD CONSTRAINT "economy_states_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "nations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migração de dados: cada país existente ganha seu estado econômico, herdando o
-- tesouro que já tinha (Decimal em unidades -> BigInt em centavos). A alíquota
-- recebe o mesmo valor inicial que um país novo receberia (economy-defaults.ts).
INSERT INTO "economy_states" (
    "id", "nationId", "treasuryCents", "taxRate", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    "id",
    ROUND("treasury" * 100)::bigint,
    20,
    CURRENT_TIMESTAMP
FROM "nations";

-- Passo 3: as colunas antigas saem só agora, com os dados já copiados.
ALTER TABLE "nations" DROP COLUMN "treasury";
ALTER TABLE "nations" DROP COLUMN "gdp";
