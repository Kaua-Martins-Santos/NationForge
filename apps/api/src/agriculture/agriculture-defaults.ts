/**
 * Estado inicial do domínio Agricultura.
 *
 * Como os demais defaults, fica no servidor: o cliente não escolhe com quanto
 * alimento seu país nasce (seção 33).
 */
export const AGRICULTURE_DEFAULTS = {
  /**
   * Um terço largo do território já plantado.
   *
   * Calibrado para o país nascer com folga pequena — produzindo cerca de 13% a
   * mais do que come, com tempo neutro. Folga grande demais tornaria a decisão
   * ignorável; nascer em déficit seria uma armadilha para quem ainda não sabe
   * que existe um painel de agricultura.
   */
  farmlandShare: 35,

  /**
   * Seis meses de consumo guardados, em toneladas.
   *
   * Reserva estratégica: um país recém-fundado precisa sobreviver à primeira
   * estiagem enquanto o jogador descobre o que é o estoque.
   */
  foodStock: 250_000n,
} as const;
