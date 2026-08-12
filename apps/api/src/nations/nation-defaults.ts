/**
 * Valores com que todo país nasce.
 *
 * Ficam no servidor, e não no corpo da requisição, para que todos os jogadores
 * comecem em pé de igualdade — se o cliente pudesse enviá-los, escolher o
 * próprio tesouro inicial seria trivial (CLAUDE.md seção 33).
 *
 * Estes números são o ponto de partida do balanceamento do jogo. Ajustá-los aqui
 * afeta apenas países criados a partir de então.
 */
export const NATION_DEFAULTS = {
  // A população inicial não está aqui: ela pertence ao domínio População
  // (ver POPULATION_DEFAULTS), dono único desse dado.

  /** Em km². */
  territory: 100_000,

  /** PIB inicial, na moeda do jogo. */
  gdp: '10000000.00',

  /** Tesouro nacional inicial. */
  treasury: '5000000.00',

  /** Índices de 0 a 100: começam em um patamar neutro-positivo. */
  happiness: 60,
  stability: 60,

  technology: 10,
  militaryPower: 10,
  infrastructure: 10,

  /** Emissões acumuladas. Um país recém-criado ainda não poluiu. */
  emissions: 0,
} as const;

/** Limites dos índices percentuais (felicidade, estabilidade). */
export const INDEX_MIN = 0;
export const INDEX_MAX = 100;
