/**
 * Estado inicial do domínio Recursos.
 *
 * Como os demais defaults, fica no servidor: a dotação natural é sorteada por
 * ele, nunca enviada pelo cliente (seção 33).
 */
export const RESOURCE_DEFAULTS = {
  /**
   * Começa em extração moderada.
   *
   * Não é zero para o país nascer produzindo algo, nem 100 para a primeira
   * decisão do jogador ser dele — e para que "aumentar" e "reduzir" sejam ambos
   * possíveis a partir do início.
   */
  extractionRate: 40,
} as const;
