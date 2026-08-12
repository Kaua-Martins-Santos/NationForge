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

/**
 * Valores monetários do jogo.
 *
 * A moeda é fictícia, então não usamos `style: 'currency'` — que forçaria um
 * símbolo real (R$, US$) e sugeriria um país do mundo real. O prefixo neutro
 * deixa claro que é dinheiro sem fingir de que moeda se trata.
 *
 * O sinal é sempre explícito quando o valor pode ser negativo (`signed`): um
 * saldo de -2 mi e um de 2 mi não podem parecer o mesmo número.
 */
export function formatMoney(value: number, { signed = false } = {}): string {
  const sign = signed && value > 0 ? '+' : '';

  return `${sign}${compactFormatter.format(value)} ₦`;
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/**
 * Instante em que a simulação foi fechada.
 *
 * Existe para o jogador saber a que momento os números se referem — a simulação
 * avança em ticks de 1 hora, então o painel mostra o estado do último tick
 * inteiro, não o de "agora".
 */
export function formatDateTime(isoDate: string): string {
  return dateTimeFormatter.format(new Date(isoDate));
}
