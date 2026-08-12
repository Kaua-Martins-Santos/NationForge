/**
 * O laço de ticks do país — onde os domínios avançam juntos.
 *
 * ## Por que este módulo existe
 *
 * Enquanto só a população evoluía, ela podia contar os próprios ticks. Com a
 * economia, isso deixou de funcionar: o PIB depende da força de trabalho, então
 * a economia precisa da população **de cada tick**, não da população final.
 *
 * Com laços separados, um jogador ausente por 100 horas teria os 100 ticks
 * econômicos calculados sobre a população final (a maior), enquanto quem
 * recarrega de hora em hora teria cada tick calculado sobre a população daquela
 * hora. Esperar renderia mais dinheiro que jogar — exatamente o exploit que a
 * Fase 10 eliminou na demografia. Inverter a ordem só inverte quem se beneficia.
 *
 * A única saída é um laço só, avançando os domínios em conjunto, um tick por vez.
 *
 * ## Ordem dentro de um tick
 *
 * 1. **População**, usando a felicidade do início do tick.
 * 2. **Economia**, usando a população já atualizada.
 * 3. **Felicidade**, movida pela carga tributária, valendo para o tick seguinte.
 *
 * A ordem é fixa e documentada porque ela é parte da regra: mudá-la muda os
 * números. O que ela garante é que nenhum domínio enxergue um estado "do meio"
 * de outro — cada um lê um estado completo e coerente.
 */

import {
  applyEconomyTick,
  type EconomySnapshot,
  type EconomyTickDelta,
} from '../economy/economy-calculations';
import {
  applyPopulationTick,
  employedFrom,
  type PopulationSnapshot,
  type PopulationTickDelta,
} from '../population/population-growth';
import { countElapsedTicks, MICRO, settleCarry, TICK_DURATION_MS } from './tick';

const HAPPINESS_MIN = 0;
const HAPPINESS_MAX = 100;

/** Tudo que a simulação lê e escreve, reunido. */
export interface SimulationState {
  population: PopulationSnapshot;
  economy: EconomySnapshot;

  /** Índice de 0 a 100, movido pela economia e lido pela migração. */
  happiness: number;

  /**
   * Resto fracionário da felicidade, em milionésimos de ponto.
   *
   * Sem ele a mecânica de impostos simplesmente não funcionaria: a variação de
   * um tick é da ordem de 0,003 ponto, que arredondaria para zero todas as
   * vezes — o imposto nunca chegaria a incomodar ninguém.
   */
  happinessCarryMicro: number;
}

/** Atributos da nação que a simulação lê, mas ainda não move. */
export interface SimulationConstants {
  technology: number;
  infrastructure: number;
}

/** Soma do que aconteceu no período, para relatórios explicarem a mudança. */
export interface SimulationTotals {
  births: number;
  deaths: number;
  migration: number;
  revenueCents: number;
  expensesCents: number;
  happinessDelta: number;
}

export interface SimulationResult {
  state: SimulationState;
  appliedTicks: number;
  /** Até quando a simulação passou a estar aplicada. */
  simulatedUntil: Date;
  totals: SimulationTotals;
}

function emptyTotals(): SimulationTotals {
  return {
    births: 0,
    deaths: 0,
    migration: 0,
    revenueCents: 0,
    expensesCents: 0,
    happinessDelta: 0,
  };
}

function accumulate(
  totals: SimulationTotals,
  population: PopulationTickDelta,
  economy: EconomyTickDelta,
): void {
  totals.births += population.births;
  totals.deaths += population.deaths;
  totals.migration += population.migration;
  totals.revenueCents += economy.revenueCents;
  totals.expensesCents += economy.expensesCents;
  totals.happinessDelta += economy.happinessDelta;
}

/**
 * Aplica a variação de felicidade acumulada, respeitando os limites do índice.
 *
 * Ao bater no teto ou no piso o resto é descartado: sem isso, um país
 * cronicamente infeliz acumularia uma dívida invisível de felicidade e demoraria
 * a reagir depois que o jogador corrigisse a alíquota.
 */
function applyHappiness(
  happiness: number,
  carryMicro: number,
  deltaPerTick: number,
): { happiness: number; carryMicro: number } {
  const { whole, remainderMicro } = settleCarry(carryMicro + Math.round(deltaPerTick * MICRO));

  const moved = happiness + whole;

  if (moved <= HAPPINESS_MIN) {
    return { happiness: HAPPINESS_MIN, carryMicro: 0 };
  }

  if (moved >= HAPPINESS_MAX) {
    return { happiness: HAPPINESS_MAX, carryMicro: 0 };
  }

  return { happiness: moved, carryMicro: remainderMicro };
}

/**
 * Avança o país do marco atual até agora.
 *
 * Função pura: recebe o estado, devolve o novo. Não sabe o que é banco — o que
 * torna a regra inteira testável sem infraestrutura.
 */
export function simulateNation(
  state: SimulationState,
  constants: SimulationConstants,
  simulatedUntil: Date,
  now: Date,
): SimulationResult {
  const appliedTicks = countElapsedTicks(simulatedUntil, now);

  if (appliedTicks === 0) {
    return { state, appliedTicks: 0, simulatedUntil, totals: emptyTotals() };
  }

  let current = state;
  const totals = emptyTotals();

  for (let tick = 0; tick < appliedTicks; tick += 1) {
    const population = applyPopulationTick(current.population, { happiness: current.happiness });

    const economy = applyEconomyTick(current.economy, {
      employed: employedFrom(population.snapshot.total, population.snapshot.education),
      population: population.snapshot.total,
      technology: constants.technology,
      infrastructure: constants.infrastructure,
      education: population.snapshot.education,
    });

    const happiness = applyHappiness(
      current.happiness,
      current.happinessCarryMicro,
      economy.delta.happinessDelta,
    );

    current = {
      population: population.snapshot,
      economy: economy.snapshot,
      happiness: happiness.happiness,
      happinessCarryMicro: happiness.carryMicro,
    };

    accumulate(totals, population.delta, economy.delta);
  }

  return {
    state: current,
    appliedTicks,
    // Avança em múltiplos exatos do tick, não para "agora": o tempo restante
    // continua valendo para o próximo cálculo.
    simulatedUntil: new Date(simulatedUntil.getTime() + appliedTicks * TICK_DURATION_MS),
    totals,
  };
}
