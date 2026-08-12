-- Resto fracionário do crescimento populacional, em milionésimos de habitante.
--
-- Sem persistir esse resto, cada cálculo arredondaria para habitante inteiro e
-- descartaria a fração: um jogador que abre o jogo de hora em hora acumularia
-- MENOS população que um que espera um dia inteiro. Com o resto guardado, a
-- aritmética dá o mesmo resultado por qualquer caminho.

-- AlterTable
ALTER TABLE "population_states" ADD COLUMN "growthCarryMicro" INTEGER NOT NULL DEFAULT 0;
