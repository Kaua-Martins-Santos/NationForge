/**
 * O clima — secas e chuvas sem quebrar o determinismo (CLAUDE.md seções 15 e 25).
 *
 * ## O problema
 *
 * A seção 15 pede clima, secas e chuvas. A seção 25 exige que o tick seja
 * determinístico. Sortear o clima a cada tick com `Math.random()` violaria a
 * segunda: dois cálculos do mesmo período dariam resultados diferentes, e o
 * jogador que recarregasse a página até pegar uma safra boa estaria jogando um
 * jogo diferente do que espera pacientemente.
 *
 * ## A saída
 *
 * O clima é uma **função pura de (semente do país, índice absoluto do tick)**.
 * Nada é sorteado durante a simulação: o tempo de cada hora do calendário já
 * está decidido desde a fundação do país, só ainda não foi consultado.
 *
 * Três consequências, todas desejadas:
 *
 * 1. Recalcular o mesmo período dá sempre a mesma safra — não há como insistir
 *    no F5 até o tempo melhorar.
 * 2. Países diferentes têm climas diferentes no mesmo instante, porque cada um
 *    tem sua semente. Um país em seca comprando comida de um país em safra farta
 *    é exatamente o motivo de existir comércio (seção 22).
 * 3. Nada disso é o sistema de eventos (Fase 20). Eventos são acontecimentos
 *    narrados e pontuais; isto é o pano de fundo contínuo sobre o qual eles vão
 *    acontecer.
 *
 * ## Duas escalas de tempo
 *
 * O fator final multiplica duas coisas:
 *
 * - **A estação**, um ciclo suave ao longo do ano. Previsível de propósito: o
 *   inverno não é notícia, é planejamento.
 * - **O período**, sorteado por janelas de ~30 dias. Seca não dura uma hora nem
 *   um ano — dura semanas, tempo suficiente para o jogador reagir e para o
 *   estoque provar que servia para alguma coisa.
 */

import { seededValue } from '../simulation/seeded-random';
import { TICKS_PER_YEAR } from '../simulation/tick';

/** Duração de um período climático: 30 dias. */
export const WEATHER_WINDOW_TICKS = 30 * 24;

/** Extremos do sorteio do período: da seca severa à safra excepcional. */
const MIN_SPELL = 0.55;
const MAX_SPELL = 1.35;

/** Quanto a estação sozinha move o rendimento, para cima e para baixo. */
const SEASON_AMPLITUDE = 0.15;

/**
 * O fator de rendimento agrícola de um tick.
 *
 * 1 é o tempo neutro; abaixo disso a lavoura rende menos que o esperado, acima
 * rende mais.
 */
export function weatherAt(seed: number, tickIndex: number): number {
  const window = Math.floor(tickIndex / WEATHER_WINDOW_TICKS);
  const spell = MIN_SPELL + seededValue(seed, window) * (MAX_SPELL - MIN_SPELL);

  const season = 1 + SEASON_AMPLITUDE * Math.sin((2 * Math.PI * tickIndex) / TICKS_PER_YEAR);

  return spell * season;
}

/**
 * Como o tempo é descrito ao jogador.
 *
 * O rótulo vem do servidor junto do fator: o número sozinho não diz se 0,8 é
 * ruim ou normal, e traduzi-lo no cliente criaria duas versões da mesma escala.
 */
export function weatherLabel(factor: number): string {
  if (factor < 0.7) return 'Seca severa';
  if (factor < 0.9) return 'Estiagem';
  if (factor < 1.1) return 'Tempo regular';
  if (factor < 1.25) return 'Chuvas favoráveis';

  return 'Safra excepcional';
}

/**
 * Converte um instante no índice de tick usado pelo clima.
 *
 * O índice é contado desde a época do Unix, não desde a fundação do país: assim
 * ele não depende de estado nenhum e o clima de uma hora é o mesmo em qualquer
 * cálculo que a alcance, venha ele de uma leitura de agora ou de um catch-up de
 * um ano.
 */
export function tickIndexOf(instant: Date): number {
  return Math.floor(instant.getTime() / (60 * 60 * 1000));
}
