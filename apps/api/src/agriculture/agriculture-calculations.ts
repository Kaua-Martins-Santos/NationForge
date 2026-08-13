/**
 * Regras da agricultura — funções puras, sem banco (CLAUDE.md seção 15).
 *
 * ## O primeiro domínio em que o estoque importa
 *
 * Recursos e produção viram dinheiro na hora. Comida não: ela é **produzida,
 * estocada e consumida**, e a população come todo tick, tenha havido safra ou
 * não. O estoque é o que separa uma seca de uma tragédia.
 *
 * ## A decisão: quanto do território virar lavoura
 *
 * Mais lavoura, mais comida — e mais manutenção saindo do tesouro todo tick,
 * mais emissões. É o primeiro gasto público de verdade do jogo: até aqui a folga
 * fiscal de uma alíquota moderada não tinha no que ser gasta.
 *
 * ## A consequência: fome
 *
 * Faltou comida, a felicidade despenca — e felicidade baixa já faz o país perder
 * gente para a emigração (Fase 10). A cadeia inteira fecha sozinha: lavoura
 * pequena → fome → infelicidade → menos habitantes → menos impostos.
 *
 * Não existe bônus por fartura. Ter comida é o normal esperado de um país, não
 * uma conquista; o que o jogo cobra é a falta.
 */

import { MICRO, settleCarry, TICKS_PER_YEAR } from '../simulation/tick';
import { weatherAt } from './weather';

const INDEX_MAX = 100;
const CENTS_PER_UNIT = 100;

export const MIN_FARMLAND_SHARE = 0;
export const MAX_FARMLAND_SHARE = 100;

/**
 * Consumo anual de alimento por habitante, em toneladas.
 *
 * Meia tonelada de grãos por pessoa por ano é a ordem de grandeza real. Serve de
 * âncora: todo o resto do balanceamento agrícola é calibrado para que um país
 * inicial consiga alimentar-se dedicando cerca de um terço do território.
 */
const FOOD_PER_CAPITA_ANNUAL = 0.5;

/** Toneladas por km² de lavoura por ano, sem tecnologia e com tempo neutro. */
const BASE_YIELD_PER_KM2 = 15;

/**
 * Peso da tecnologia no rendimento. No máximo, a mesma terra produz 1,8x — é o
 * que a seção 15 pede ao listar tecnologia entre os fatores da agricultura, e o
 * que vai dar sentido à árvore tecnológica (irrigação, máquinas, fazendas
 * inteligentes) na Fase 18.
 */
const YIELD_TECH_WEIGHT = 0.8;

/** Custo anual de manter um km² de lavoura, em centavos. */
const FARMLAND_ANNUAL_COST_PER_KM2_CENTS = 8_000 * CENTS_PER_UNIT;

/** Pontos de emissão por km² de lavoura por ano. */
const FARMLAND_ANNUAL_EMISSIONS_PER_KM2 = 0.002;

/**
 * Pontos de felicidade por ano perdidos com a população inteira passando fome.
 *
 * Maior que a perda do imposto no confisco (24): não ter o que comer dói mais
 * que ser taxado até o osso.
 */
const MAX_ANNUAL_HUNGER_HAPPINESS_LOSS = 40;

export interface AgricultureSnapshot {
  /** Fração do território dedicada à lavoura, 0 a 100. */
  farmlandShare: number;
  /** Alimento estocado, em toneladas. */
  foodStock: bigint;
  /** Resto fracionário do estoque, em milionésimos de tonelada. */
  foodCarryMicro: number;
  /**
   * Semente do clima do país.
   *
   * Própria do domínio, e não emprestada da dotação natural: acoplar os dois
   * faria a mesma semente decidir onde há petróleo e quando chove, e mexer em um
   * mudaria o outro sem motivo.
   */
  weatherSeed: number;
}

/** Fatores de outros domínios que a agricultura consome. */
export interface AgricultureContext {
  /** Quem come. */
  population: bigint;
  /** Território do país, em km² — o teto do que pode virar lavoura. */
  territory: number;
  technology: number;
  /** Índice absoluto do tick, de onde sai o clima da hora. */
  tickIndex: number;
}

/** O que aconteceu com a comida em um tick. */
export interface AgricultureTickDelta {
  produced: number;
  /** O que a população de fato comeu — pode ser menos do que precisava. */
  consumed: number;
  /** Fração da demanda não atendida, de 0 a 1. */
  shortage: number;
  costCents: number;
  emissions: number;
  /** Perda de felicidade causada pela fome, em pontos. Nunca positiva. */
  happinessDelta: number;
  /** Fator climático do tick, para relatórios explicarem uma safra ruim. */
  weather: number;
}

/** Área de lavoura do país, em km². */
export function farmlandArea(share: number, territory: number): number {
  return territory * (share / MAX_FARMLAND_SHARE);
}

/** Quanto a lavoura rende por ano com o tempo neutro (fator 1). */
export function annualFarmlandYield(
  share: number,
  context: Pick<AgricultureContext, 'territory' | 'technology'>,
): number {
  const multiplier = 1 + (context.technology / INDEX_MAX) * YIELD_TECH_WEIGHT;

  return farmlandArea(share, context.territory) * BASE_YIELD_PER_KM2 * multiplier;
}

/** Quanto o país come por ano. */
export function annualConsumption(population: bigint): number {
  return Number(population) * FOOD_PER_CAPITA_ANNUAL;
}

/** Quanto a lavoura custa por ano, em centavos. */
export function annualFarmlandCostCents(share: number, territory: number): number {
  return farmlandArea(share, territory) * FARMLAND_ANNUAL_COST_PER_KM2_CENTS;
}

/**
 * Aplica um tick de agricultura.
 *
 * A ordem interna é a da vida real: planta-se, colhe-se o que o tempo permitiu,
 * come-se do que há — colheita mais estoque — e o que sobra fica guardado.
 */
export function applyAgricultureTick(
  snapshot: AgricultureSnapshot,
  context: AgricultureContext,
): { snapshot: AgricultureSnapshot; delta: AgricultureTickDelta } {
  const weather = weatherAt(snapshot.weatherSeed, context.tickIndex);

  const producedMicro = Math.round(
    ((annualFarmlandYield(snapshot.farmlandShare, context) * weather) / TICKS_PER_YEAR) * MICRO,
  );

  const demandMicro = Math.round((annualConsumption(context.population) / TICKS_PER_YEAR) * MICRO);

  // Come-se da colheita e do que estava guardado. O estoque é o que transforma
  // uma seca de trinta dias em um susto em vez de uma fome.
  const stockMicro = Number(snapshot.foodStock) * MICRO + snapshot.foodCarryMicro;
  const availableMicro = Math.max(stockMicro + producedMicro, 0);

  const consumedMicro = Math.min(demandMicro, availableMicro);

  const { whole, remainderMicro } = settleCarry(
    snapshot.foodCarryMicro + producedMicro - consumedMicro,
  );

  const area = farmlandArea(snapshot.farmlandShare, context.territory);
  const shortage = demandMicro > 0 ? (demandMicro - consumedMicro) / demandMicro : 0;

  return {
    snapshot: {
      ...snapshot,
      // Nunca negativo por construção: não se come o que não existe.
      foodStock: snapshot.foodStock + BigInt(whole),
      foodCarryMicro: remainderMicro,
    },
    delta: {
      produced: producedMicro / MICRO,
      consumed: consumedMicro / MICRO,
      shortage,
      costCents:
        annualFarmlandCostCents(snapshot.farmlandShare, context.territory) / TICKS_PER_YEAR,
      emissions: (area * FARMLAND_ANNUAL_EMISSIONS_PER_KM2) / TICKS_PER_YEAR,
      // O `if` evita devolver -0 para um país bem alimentado: um zero negativo
      // atravessaria a simulação inteira e apareceria em comparações de teste.
      happinessDelta:
        shortage > 0 ? (-MAX_ANNUAL_HUNGER_HAPPINESS_LOSS * shortage) / TICKS_PER_YEAR : 0,
      weather,
    },
  };
}
