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
 * 2. **Extração**, que consome reservas e gera receita.
 * 3. **Produção**, que desvia parte do que foi extraído para a indústria — só o
 *    que saiu do solo neste tick, nunca a reserva.
 * 4. **Agricultura**, que colhe conforme o tempo e alimenta a população já
 *    atualizada — quem nasceu neste tick come neste tick.
 * 5. **Economia**, usando a população já atualizada, a receita da extração, o
 *    ganho da produção e o custo da lavoura — tudo no mesmo tick em que
 *    aconteceu.
 * 6. **Felicidade**, movida pela carga tributária e pela fome, valendo para o
 *    tick seguinte.
 * 7. **Emissões**, acumuladas pelo que foi extraído, processado e plantado.
 *
 * A ordem é fixa e documentada porque ela é parte da regra: mudá-la muda os
 * números. O que ela garante é que nenhum domínio enxergue um estado "do meio"
 * de outro — cada um lê um estado completo e coerente.
 */

import type { ResourceType } from '../../generated/prisma/enums';
import {
  applyAgricultureTick,
  type AgricultureSnapshot,
  type AgricultureTickDelta,
} from '../agriculture/agriculture-calculations';
import { tickIndexOf } from '../agriculture/weather';
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
import {
  applyProductionTick,
  type ProductionLineSnapshot,
  type ProductionTickResult,
} from '../production/production-calculations';
import {
  applyDepositTick,
  type DepositSnapshot,
  type ExtractionContext,
} from '../resources/resource-extraction';
import { countElapsedTicks, MICRO, settleCarry, TICK_DURATION_MS } from './tick';

const HAPPINESS_MIN = 0;
const HAPPINESS_MAX = 100;

/** Tudo que a simulação lê e escreve, reunido. */
export interface SimulationState {
  population: PopulationSnapshot;
  economy: EconomySnapshot;

  /** Depósitos do país. Vazio é válido: um país pode não ter recurso algum. */
  deposits: DepositSnapshot[];

  /** Intensidade de extração escolhida pelo jogador, 0 a 100. */
  extractionRate: number;

  /** Linhas de produção do país, uma por bem do catálogo. */
  productionLines: ProductionLineSnapshot[];

  /** Lavoura, estoque de comida e semente do clima. */
  agriculture: AgricultureSnapshot;

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

  /** Emissões acumuladas, e o resto fracionário pelo mesmo motivo. */
  emissions: number;
  emissionsCarryMicro: number;
}

/** Atributos da nação que a simulação lê, mas ainda não move. */
export interface SimulationConstants {
  technology: number;
  infrastructure: number;
  /** Em km²: o teto do que pode virar lavoura. */
  territory: number;
}

/** Soma do que aconteceu no período, para relatórios explicarem a mudança. */
export interface SimulationTotals {
  births: number;
  deaths: number;
  migration: number;
  revenueCents: number;
  expensesCents: number;
  happinessDelta: number;
  /** Receita líquida da extração, já sem o custo de operação. */
  resourceRevenueCents: number;
  extracted: number;
  /** Ganho da produção sobre vender o insumo bruto. */
  valueAddedCents: number;
  /** Unidades de bens fabricadas. */
  produced: number;
  /** Alimento colhido e comido no período, em toneladas. */
  foodProduced: number;
  foodConsumed: number;
  /**
   * Ticks em que faltou comida.
   *
   * Contagem, e não média: um relatório precisa poder dizer "houve fome durante
   * 30 horas", e uma média diluiria uma crise curta em um período longo.
   */
  hungryTicks: number;
  emissions: number;
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
    resourceRevenueCents: 0,
    extracted: 0,
    valueAddedCents: 0,
    produced: 0,
    foodProduced: 0,
    foodConsumed: 0,
    hungryTicks: 0,
    emissions: 0,
  };
}

function accumulate(
  totals: SimulationTotals,
  population: PopulationTickDelta,
  economy: EconomyTickDelta,
  extraction: ExtractionTickResult,
  production: ProductionTickResult,
  agriculture: AgricultureTickDelta,
): void {
  totals.births += population.births;
  totals.deaths += population.deaths;
  totals.migration += population.migration;
  totals.revenueCents += economy.revenueCents;
  totals.expensesCents += economy.expensesCents;
  totals.happinessDelta += economy.happinessDelta + agriculture.happinessDelta;
  totals.resourceRevenueCents += extraction.netRevenueCents;
  totals.extracted += extraction.extracted;
  totals.valueAddedCents += production.valueAddedCents;
  totals.produced += production.produced;
  totals.foodProduced += agriculture.produced;
  totals.foodConsumed += agriculture.consumed;
  totals.hungryTicks += agriculture.shortage > 0 ? 1 : 0;
  totals.emissions += extraction.emissions + production.emissions + agriculture.emissions;
}

interface ExtractionTickResult {
  deposits: DepositSnapshot[];
  /** Receita já líquida do custo de operação. */
  netRevenueCents: number;
  /**
   * Unidades extraídas por recurso neste tick.
   *
   * É o que a produção pode desviar: o fluxo do tick, nunca a reserva. Sai daqui
   * como mapa porque quem consome procura por tipo, não percorre a lista.
   */
  output: Map<ResourceType, number>;
  extracted: number;
  emissions: number;
}

/** Roda um tick de extração em todos os depósitos do país. */
function extractionTick(
  deposits: DepositSnapshot[],
  context: ExtractionContext,
): ExtractionTickResult {
  const next: DepositSnapshot[] = [];
  const output = new Map<ResourceType, number>();
  let netRevenueCents = 0;
  let extracted = 0;
  let emissions = 0;

  for (const deposit of deposits) {
    const result = applyDepositTick(deposit, context);

    next.push(result.deposit);
    output.set(result.delta.type, result.delta.extracted);
    netRevenueCents += result.delta.revenueCents - result.delta.operatingCostCents;
    extracted += result.delta.extracted;
    emissions += result.delta.emissions;
  }

  return { deposits: next, output, netRevenueCents, extracted, emissions };
}

/**
 * Acumula emissões, que só crescem.
 *
 * Sem teto: um índice de 0 a 100 diria que existe um "máximo de poluição", o que
 * não faz sentido para um total histórico. O que vai limitar não é um clamp e
 * sim a consequência — quando o meio ambiente tiver fase própria, emissões altas
 * passam a cobrar seu preço em saúde e felicidade.
 */
function applyEmissions(
  emissions: number,
  carryMicro: number,
  deltaPerTick: number,
): { emissions: number; carryMicro: number } {
  const { whole, remainderMicro } = settleCarry(carryMicro + Math.round(deltaPerTick * MICRO));

  return { emissions: emissions + whole, carryMicro: remainderMicro };
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

  // O clima é indexado pelo instante do calendário, não pela posição dentro
  // deste laço: é o que faz a mesma hora ter o mesmo tempo, seja ela alcançada
  // por uma leitura de agora ou por um catch-up de um ano.
  const firstTickIndex = tickIndexOf(simulatedUntil);

  for (let tick = 0; tick < appliedTicks; tick += 1) {
    const population = applyPopulationTick(current.population, { happiness: current.happiness });

    const extraction = extractionTick(current.deposits, {
      extractionRate: current.extractionRate,
      technology: constants.technology,
      infrastructure: constants.infrastructure,
    });

    const employed = employedFrom(population.snapshot.total, population.snapshot.education);

    const production = applyProductionTick(current.productionLines, extraction.output, {
      employed,
      technology: constants.technology,
      infrastructure: constants.infrastructure,
    });

    const agriculture = applyAgricultureTick(current.agriculture, {
      population: population.snapshot.total,
      territory: constants.territory,
      technology: constants.technology,
      tickIndex: firstTickIndex + tick,
    });

    const economy = applyEconomyTick(current.economy, {
      employed,
      population: population.snapshot.total,
      technology: constants.technology,
      infrastructure: constants.infrastructure,
      education: population.snapshot.education,
      // A extração deste tick entra no tesouro deste tick, não do próximo. A
      // produção entra apenas com o que agregou: a venda do insumo bruto já está
      // contada na receita da extração.
      externalRevenueCents: extraction.netRevenueCents + production.valueAddedCents,
      externalExpensesCents: agriculture.delta.costCents,
    });

    // Imposto e fome empurram a felicidade juntos: quem aplica é o orquestrador
    // porque felicidade é atributo da nação, não de um domínio.
    const happiness = applyHappiness(
      current.happiness,
      current.happinessCarryMicro,
      economy.delta.happinessDelta + agriculture.delta.happinessDelta,
    );

    const emissions = applyEmissions(
      current.emissions,
      current.emissionsCarryMicro,
      extraction.emissions + production.emissions + agriculture.delta.emissions,
    );

    current = {
      population: population.snapshot,
      economy: economy.snapshot,
      deposits: extraction.deposits,
      extractionRate: current.extractionRate,
      productionLines: production.lines,
      agriculture: agriculture.snapshot,
      happiness: happiness.happiness,
      happinessCarryMicro: happiness.carryMicro,
      emissions: emissions.emissions,
      emissionsCarryMicro: emissions.carryMicro,
    };

    accumulate(totals, population.delta, economy.delta, extraction, production, agriculture.delta);
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
