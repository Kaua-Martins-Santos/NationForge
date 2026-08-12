const compactFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fullFormatter = new Intl.NumberFormat('pt-BR');

/**
 * Números grandes de forma compacta (1,2 mi), para os valores dos stat tiles.
 * Abaixo de 10 mil o número inteiro cabe e é mais informativo que "9,8 mil".
 */
export function formatCompact(value: number): string {
  return value < 10_000 ? fullFormatter.format(value) : compactFormatter.format(value);
}

/** Número completo com separador de milhar, para o valor-herói e tabelas. */
export function formatFull(value: number): string {
  return fullFormatter.format(value);
}
