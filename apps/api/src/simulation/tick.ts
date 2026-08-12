/**
 * A unidade de tempo do jogo, compartilhada por todos os domínios.
 *
 * Vive fora de população e economia porque o tempo não pertence a nenhum
 * domínio: os dois avançam no mesmo laço, no mesmo compasso.
 */

/** 1 tick = 1 hora do jogo (CLAUDE.md seção 25). */
export const TICK_DURATION_MS = 60 * 60 * 1000;

/** Ticks em um ano — o denominador de toda taxa anual do jogo. */
export const TICKS_PER_YEAR = 8760;

/**
 * Teto de ticks aplicados em um único cálculo (1 ano).
 *
 * Limita o custo do laço para um jogador que voltou depois de muito tempo. Um
 * ano de ausência já é um caso extremo, e 8760 iterações de aritmética são
 * triviais.
 */
export const MAX_CATCH_UP_TICKS = TICKS_PER_YEAR;

/**
 * Unidade interna de toda aritmética fracionária: milionésimos.
 *
 * Habitantes e centavos usam a mesma escala para que a técnica do resto
 * acumulado (`carry`) seja idêntica nos dois domínios.
 */
export const MICRO = 1_000_000;

/**
 * Quantos ticks inteiros cabem entre o marco da simulação e agora.
 *
 * Só ticks **inteiros** contam: o tempo parcial não é descartado, fica valendo
 * para o próximo cálculo. É a primeira das defesas contra ganhar recursos
 * recarregando a página (seção 26).
 */
export function countElapsedTicks(simulatedUntil: Date, now: Date): number {
  const elapsedMs = now.getTime() - simulatedUntil.getTime();

  if (elapsedMs <= 0) {
    return 0;
  }

  return Math.min(Math.floor(elapsedMs / TICK_DURATION_MS), MAX_CATCH_UP_TICKS);
}

/**
 * Move o resto acumulado para unidades inteiras.
 *
 * `floor` (e não `trunc`) mantém o resto sempre em [0, MICRO), inclusive quando
 * o valor está encolhendo — o que faz a aritmética fechar igual nos dois
 * sentidos.
 */
export function settleCarry(carryMicro: number): { whole: number; remainderMicro: number } {
  const whole = Math.floor(carryMicro / MICRO);

  return { whole, remainderMicro: carryMicro - whole * MICRO };
}
