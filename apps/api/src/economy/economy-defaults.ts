import { NEUTRAL_TAX_RATE } from './economy-calculations';

/**
 * Estado econômico com que todo país nasce.
 *
 * Como NATION_DEFAULTS e POPULATION_DEFAULTS, fica no servidor: se o cliente
 * pudesse enviá-lo, escolher o próprio tesouro inicial seria trivial (seção 33).
 */
export const ECONOMY_DEFAULTS = {
  /** 5 milhões na moeda do jogo, em centavos. */
  treasuryCents: 500_000_000n,

  /**
   * Começa na alíquota neutra: o país nasce sem bônus nem penalidade de
   * felicidade, e a primeira decisão econômica do jogador é dele.
   */
  taxRate: NEUTRAL_TAX_RATE,
} as const;
