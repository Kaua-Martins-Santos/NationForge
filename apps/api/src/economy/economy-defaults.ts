import { NEUTRAL_TAX_RATE } from './economy-calculations';

/**
 * Estado econômico com que todo país nasce.
 *
 * Como NATION_DEFAULTS e POPULATION_DEFAULTS, fica no servidor: se o cliente
 * pudesse enviá-lo, escolher o próprio tesouro inicial seria trivial (seção 33).
 */
export const ECONOMY_DEFAULTS = {
  /**
   * 200 milhões na moeda do jogo, em centavos — cerca de 1,5% do PIB inicial.
   *
   * A proporção com o PIB é o que importa, não o número absoluto: o valor
   * anterior (5 milhões) equivalia a 0,04% do PIB e era consumido ou
   * multiplicado nas primeiras horas de simulação, o que tornava o tesouro
   * inicial irrelevante para qualquer decisão.
   */
  treasuryCents: 20_000_000_000n,

  /**
   * Começa na alíquota neutra: o país nasce sem bônus nem penalidade de
   * felicidade, e a primeira decisão econômica do jogador é dele.
   */
  taxRate: NEUTRAL_TAX_RATE,
} as const;
