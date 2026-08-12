-- Resto fracionário da felicidade, em milionésimos de ponto.
--
-- Separado da migration anterior porque a necessidade só apareceu ao escrever o
-- laço de ticks: a carga tributária move a felicidade em ~0,003 ponto por tick,
-- que arredondaria para zero sempre. Sem guardar o resto, o imposto jamais
-- chegaria a afetar ninguém — a mecânica existiria só no papel.
--
-- Default 0 cobre os países existentes: começar sem resto acumulado é o estado
-- correto para quem nunca teve a felicidade movida pela economia.
ALTER TABLE "nations" ADD COLUMN "happinessCarryMicro" INTEGER NOT NULL DEFAULT 0;
