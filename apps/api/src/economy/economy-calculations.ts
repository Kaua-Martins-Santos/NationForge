/**
 * Regras econômicas — funções puras, sem banco e sem aleatoriedade (seção 25).
 *
 * ## O PIB não é armazenado
 *
 * O PIB é **derivado** a cada leitura, de trabalhadores × produtividade. Guardá-lo
 * criaria uma segunda fonte da verdade para um número que já é consequência da
 * população, da tecnologia e da infraestrutura — e que ficaria defasado a cada
 * mudança nesses domínios. É o mesmo raciocínio que mantém o emprego derivado.
 *
 * ## Dinheiro em centavos inteiros
 *
 * Nada aqui usa ponto flutuante para valor acumulado. O tesouro é um BigInt de
 * centavos e o resto fracionário do tick é guardado em milionésimos de centavo,
 * pela mesma razão que a população guarda o seu: sem isso, a frequência com que
 * o jogador abre o jogo mudaria quanto ele arrecada.
 */

import { MICRO, settleCarry, TICKS_PER_YEAR } from '../simulation/tick';

const INDEX_MAX = 100;
const CENTS_PER_UNIT = 100;

/**
 * Quanto um trabalhador produz por ano, em centavos, num país sem tecnologia
 * nem infraestrutura. É a âncora do balanceamento econômico.
 */
const BASE_OUTPUT_PER_WORKER_CENTS = 20_000 * CENTS_PER_UNIT;

/**
 * Peso de cada domínio na produtividade. Nos valores máximos (100/100/100), um
 * trabalhador produz 2,5x o piso — tecnologia pesa mais que os demais porque é
 * o eixo de progresso de longo prazo do jogo (seção 18).
 */
const PRODUCTIVITY_WEIGHTS = {
  technology: 0.8,
  infrastructure: 0.4,
  education: 0.3,
} as const;

/**
 * Custo anual dos serviços públicos por habitante, em centavos.
 *
 * Na alíquota neutra isso deixa o país com folga fiscal larga — de propósito,
 * por ora: ainda não existe no que gastar. Construções (Fase 17), exército
 * (Fase 24) e pesquisa (Fase 18) é que vão consumir o superávit e transformar
 * a alíquota numa escolha difícil. Rebalancear antes deles seria chutar.
 */
const PUBLIC_SPENDING_PER_CAPITA_CENTS = 1_200 * CENTS_PER_UNIT;

/** Receita anual de impostos, em centavos. */
export function annualRevenueCents(taxRate: number, context: EconomyContext): number {
  return Number(gdpCents(context)) * (taxRate / MAX_TAX_RATE);
}

/** Despesa anual com serviços públicos, em centavos. */
export function annualExpensesCents(context: EconomyContext): number {
  return Number(context.population) * PUBLIC_SPENDING_PER_CAPITA_CENTS;
}

/**
 * Alíquota que o jogador não sente: abaixo dela o imposto agrada, acima
 * incomoda. Serve de ponto neutro para o efeito sobre a felicidade.
 */
export const NEUTRAL_TAX_RATE = 20;

export const MIN_TAX_RATE = 0;
export const MAX_TAX_RATE = 100;

/**
 * Quantos pontos de felicidade por ano a alíquota move, no extremo.
 *
 * Com imposto zerado o país ganha até 6 pontos ao ano; com 100% perde até 24.
 * A assimetria é intencional: confiscar toda a renda deve doer mais do que não
 * cobrar nada agrada.
 */
const MAX_ANNUAL_HAPPINESS_GAIN = 6;
const MAX_ANNUAL_HAPPINESS_LOSS = 24;

export interface EconomySnapshot {
  /** Tesouro em centavos. Pode ser negativo: o país entra no vermelho. */
  treasuryCents: bigint;
  /** Resto fracionário do saldo, em milionésimos de centavo. */
  treasuryCarryMicro: number;
  /** Alíquota de imposto, 0 a 100. */
  taxRate: number;
}

/** Fatores de outros domínios que a economia consome. */
export interface EconomyContext {
  /** Habitantes empregados — a força de trabalho que produz. */
  employed: bigint;
  /** População total — quem consome os serviços públicos. */
  population: bigint;
  technology: number;
  infrastructure: number;
  education: number;

  /**
   * Receita de outros domínios que entra no tesouro neste tick, em centavos.
   *
   * Hoje é a extração de recursos. Ela chega por aqui, e não é somada ao tesouro
   * por fora, porque o tesouro tem um dono só: se cada domínio somasse direto,
   * cada um precisaria da sua própria aritmética de resto acumulado e o total
   * deixaria de fechar.
   */
  externalRevenueCents?: number;
}

/** O que aconteceu com o dinheiro em um tick, em centavos. */
export interface EconomyTickDelta {
  revenueCents: number;
  expensesCents: number;
  /** Receita menos despesa. Negativo quando o país gasta mais do que arrecada. */
  balanceCents: number;
  /** Variação de felicidade causada pela carga tributária, em pontos. */
  happinessDelta: number;
}

/**
 * Quanto cada trabalhador produz por ano, em centavos.
 *
 * Tecnologia, infraestrutura e educação multiplicam o piso. Um país que investe
 * nos três produz mais com a mesma população — é o que dá sentido a investir.
 */
export function outputPerWorkerCents(
  technology: number,
  infrastructure: number,
  education: number,
): number {
  const multiplier =
    1 +
    (technology / INDEX_MAX) * PRODUCTIVITY_WEIGHTS.technology +
    (infrastructure / INDEX_MAX) * PRODUCTIVITY_WEIGHTS.infrastructure +
    (education / INDEX_MAX) * PRODUCTIVITY_WEIGHTS.education;

  return BASE_OUTPUT_PER_WORKER_CENTS * multiplier;
}

/**
 * PIB anual do país, em centavos.
 *
 * Derivado, nunca persistido: é sempre coerente com a população e os índices do
 * momento em que foi pedido.
 */
export function gdpCents(context: EconomyContext): bigint {
  const perWorker = outputPerWorkerCents(
    context.technology,
    context.infrastructure,
    context.education,
  );

  return BigInt(Math.round(Number(context.employed) * perWorker));
}

/**
 * Efeito da alíquota sobre a felicidade, em pontos por ano.
 *
 * Positivo abaixo da alíquota neutra, negativo acima — a consequência que o
 * CLAUDE.md seção 13 pede: mais imposto, mais receita, menos felicidade.
 */
export function annualHappinessFromTax(taxRate: number): number {
  if (taxRate <= NEUTRAL_TAX_RATE) {
    const relief = (NEUTRAL_TAX_RATE - taxRate) / NEUTRAL_TAX_RATE;

    return relief * MAX_ANNUAL_HAPPINESS_GAIN;
  }

  const burden = (taxRate - NEUTRAL_TAX_RATE) / (MAX_TAX_RATE - NEUTRAL_TAX_RATE);

  return -burden * MAX_ANNUAL_HAPPINESS_LOSS;
}

/**
 * Aplica um único tick econômico.
 *
 * Arrecada sobre o PIB, paga os serviços públicos e credita o saldo ao tesouro.
 * A felicidade não é alterada aqui: este módulo apenas informa a variação, e
 * quem a aplica é o orquestrador — felicidade é um atributo da nação, e vários
 * domínios vão querer movê-la.
 */
export function applyEconomyTick(
  snapshot: EconomySnapshot,
  context: EconomyContext,
): { snapshot: EconomySnapshot; delta: EconomyTickDelta } {
  const taxRevenueCents = annualRevenueCents(snapshot.taxRate, context) / TICKS_PER_YEAR;
  const revenueCents = taxRevenueCents + (context.externalRevenueCents ?? 0);
  const expensesCents = annualExpensesCents(context) / TICKS_PER_YEAR;

  const balanceMicro = Math.round((revenueCents - expensesCents) * MICRO);

  const { whole, remainderMicro } = settleCarry(snapshot.treasuryCarryMicro + balanceMicro);

  return {
    snapshot: {
      ...snapshot,
      treasuryCents: snapshot.treasuryCents + BigInt(whole),
      treasuryCarryMicro: remainderMicro,
    },
    delta: {
      revenueCents,
      expensesCents,
      balanceCents: revenueCents - expensesCents,
      happinessDelta: annualHappinessFromTax(snapshot.taxRate) / TICKS_PER_YEAR,
    },
  };
}
