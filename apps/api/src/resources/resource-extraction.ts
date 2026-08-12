/**
 * Regras de extração — funções puras, sem banco e sem aleatoriedade (seção 25).
 *
 * ## Reservas se esgotam, e é isso que cria a decisão
 *
 * O que sai do solo não volta. Extrair a toda força rende dinheiro agora e deixa
 * o país sem nada depois; extrair devagar preserva a reserva e o ar, mas rende
 * menos. Sem essa tensão, a intensidade de extração teria uma resposta óbvia
 * (100%) e não seria decisão nenhuma.
 *
 * ## Extração proporcional à reserva
 *
 * O que sai por tick é uma fração do que **ainda resta**, não um valor fixo.
 * Duas consequências, ambas desejadas:
 *
 * 1. O depósito se esgota de forma assintótica — fica cada vez mais lento,
 *    imitando um poço que perde pressão, em vez de secar de um dia para o outro.
 * 2. A reserva nunca fica negativa por construção, sem precisar de um `clamp`
 *    que esconderia erro de cálculo.
 */

import { MICRO, settleCarry, TICKS_PER_YEAR } from '../simulation/tick';
import { RESOURCE_CATALOG } from './resource-catalog';
import type { ResourceType } from '../../generated/prisma/enums';

const INDEX_MAX = 100;
const MILLION = 1_000_000;

export const MIN_EXTRACTION_RATE = 0;
export const MAX_EXTRACTION_RATE = 100;

/**
 * Fração da reserva que sai em um ano com a extração no máximo e sem nenhuma
 * tecnologia ou infraestrutura.
 */
const BASE_ANNUAL_EXTRACTION_FRACTION = 0.02;

/**
 * Peso de tecnologia e infraestrutura na capacidade de extração. Nos valores
 * máximos, o país extrai 2x o piso — investir em desenvolvimento vale para os
 * recursos também, não só para o PIB.
 */
const EXTRACTION_WEIGHTS = { technology: 0.6, infrastructure: 0.4 } as const;

/**
 * Parcela do valor extraído que se perde em custo de operação.
 *
 * Extrair não é lucro puro: sobra 65% do preço de referência. É o que impede a
 * extração de ser dinheiro grátis e dá alguma chance de a conta não fechar
 * quando o resto da economia estiver mal.
 */
const OPERATING_COST_SHARE = 0.35;

export interface DepositSnapshot {
  type: ResourceType;
  reserves: bigint;
  extractedTotal: bigint;
  extractionCarryMicro: number;
}

/** Fatores de outros domínios que a extração consome. */
export interface ExtractionContext {
  extractionRate: number;
  technology: number;
  infrastructure: number;
}

/** O que um depósito produziu em um tick. */
export interface DepositTickDelta {
  type: ResourceType;
  /** Unidades extraídas, incluindo a fração que ficou no resto acumulado. */
  extracted: number;
  revenueCents: number;
  operatingCostCents: number;
  emissions: number;
}

/** Multiplicador de capacidade vindo de tecnologia e infraestrutura. */
export function extractionEfficiency(technology: number, infrastructure: number): number {
  return (
    1 +
    (technology / INDEX_MAX) * EXTRACTION_WEIGHTS.technology +
    (infrastructure / INDEX_MAX) * EXTRACTION_WEIGHTS.infrastructure
  );
}

/** Quantas unidades um depósito produz por ano nas condições atuais. */
export function annualExtraction(reserves: bigint, context: ExtractionContext): number {
  const intensity = context.extractionRate / MAX_EXTRACTION_RATE;

  return (
    Number(reserves) *
    BASE_ANNUAL_EXTRACTION_FRACTION *
    intensity *
    extractionEfficiency(context.technology, context.infrastructure)
  );
}

/** Receita bruta anual de um depósito, em centavos, ao preço de referência. */
export function annualRevenueOf(deposit: DepositSnapshot, context: ExtractionContext): number {
  return (
    annualExtraction(deposit.reserves, context) * RESOURCE_CATALOG[deposit.type].basePriceCents
  );
}

/** Receita líquida anual, já descontado o custo de operação. */
export function annualNetRevenueOf(deposit: DepositSnapshot, context: ExtractionContext): number {
  return annualRevenueOf(deposit, context) * (1 - OPERATING_COST_SHARE);
}

/**
 * Aplica um tick de extração a um depósito.
 *
 * A aritmética é feita em milionésimos de unidade e o resto é devolvido, pela
 * mesma razão que a população e o dinheiro guardam o seu: com uma reserva
 * pequena ou a extração no mínimo, um tick move muito menos de uma unidade, e
 * arredondar descartaria tudo.
 */
export function applyDepositTick(
  deposit: DepositSnapshot,
  context: ExtractionContext,
): { deposit: DepositSnapshot; delta: DepositTickDelta } {
  const definition = RESOURCE_CATALOG[deposit.type];

  const extractedMicro = Math.round(
    (annualExtraction(deposit.reserves, context) / TICKS_PER_YEAR) * MICRO,
  );

  const { whole, remainderMicro } = settleCarry(deposit.extractionCarryMicro + extractedMicro);

  // A reserva cai pelas unidades inteiras que saíram; a fração continua no solo,
  // guardada no resto — por isso o total extraído e a reserva sempre fecham.
  const extractedWhole = BigInt(whole);

  const extracted = extractedMicro / MICRO;
  const revenueCents = extracted * definition.basePriceCents;

  return {
    deposit: {
      ...deposit,
      reserves: deposit.reserves - extractedWhole,
      extractedTotal: deposit.extractedTotal + extractedWhole,
      extractionCarryMicro: remainderMicro,
    },
    delta: {
      type: deposit.type,
      extracted,
      revenueCents,
      operatingCostCents: revenueCents * OPERATING_COST_SHARE,
      emissions: (extracted / MILLION) * definition.emissionsPerMillion,
    },
  };
}
