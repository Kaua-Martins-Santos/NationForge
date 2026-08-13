/**
 * Estado inicial do domínio Produção.
 *
 * Como os demais defaults, fica no servidor: o cliente não escolhe com quanta
 * indústria seu país nasce (seção 33).
 */
export const PRODUCTION_DEFAULTS = {
  /**
   * Começa beneficiando uma parte pequena do que extrai.
   *
   * Não é zero para o jogador ver a mecânica funcionando antes de mexer nela, e
   * é baixo o bastante para caber na capacidade industrial de um país novo — a
   * primeira vez que ele esbarra no teto deve ser uma escolha dele, não o estado
   * em que nasceu.
   */
  allocation: 30,
} as const;
