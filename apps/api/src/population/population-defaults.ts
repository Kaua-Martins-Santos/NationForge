/**
 * Estado demográfico com que todo país nasce.
 *
 * Como NATION_DEFAULTS, fica no servidor: o cliente não escolhe sua própria
 * população inicial (CLAUDE.md seção 33).
 */
export const POPULATION_DEFAULTS = {
  /** 1 milhão de habitantes. */
  total: 1_000_000n,

  /** Nascimentos por mil habitantes por ano. */
  birthRatePerThousand: 18,

  /** Mortes por mil habitantes por ano. */
  deathRatePerThousand: 8,

  /** Índices de 0 a 100. */
  health: 50,
  education: 10,
} as const;
