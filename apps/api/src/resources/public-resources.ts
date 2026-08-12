import type { ResourceDeposit, ResourceState } from '../../generated/prisma/client';
import type { ResourceType } from '../../generated/prisma/enums';
import { RESOURCE_CATALOG, RESOURCE_ORDER } from './resource-catalog';
import {
  annualExtraction,
  annualNetRevenueOf,
  type ExtractionContext,
} from './resource-extraction';

const CENTS_PER_UNIT = 100;

/**
 * Um depósito pronto para sair em JSON.
 *
 * Traz as projeções anuais junto: sem ver quanto um depósito rende e quanto
 * tempo ainda dura, a intensidade de extração seria escolhida no escuro. As
 * projeções usam as mesmas funções que o tick — não há uma segunda fórmula para
 * o que o jogador vê.
 */
export interface PublicDeposit {
  type: ResourceType;
  label: string;
  reserves: number;
  extractedTotal: number;
  /** Unidades por ano na intensidade atual. */
  annualExtraction: number;
  /** Receita anual já sem o custo de operação, em unidades da moeda. */
  annualRevenue: number;
  /**
   * Anos até a reserva acabar no ritmo atual, ou `null` quando não há extração.
   *
   * É uma estimativa linear e por isso otimista: como o que sai é proporcional
   * ao que resta, o depósito na verdade desacelera e dura mais. Serve para
   * comparar depósitos entre si, não como previsão exata.
   */
  yearsRemaining: number | null;
}

export interface PublicResources {
  extractionRate: number;
  deposits: PublicDeposit[];
  /** Soma da receita anual líquida de todos os depósitos. */
  annualRevenue: number;
}

function toPublicDeposit(deposit: ResourceDeposit, context: ExtractionContext): PublicDeposit {
  const perYear = annualExtraction(deposit.reserves, context);

  const snapshot = {
    type: deposit.type,
    reserves: deposit.reserves,
    extractedTotal: deposit.extractedTotal,
    extractionCarryMicro: deposit.extractionCarryMicro,
  };

  return {
    type: deposit.type,
    label: RESOURCE_CATALOG[deposit.type].label,
    reserves: Number(deposit.reserves),
    extractedTotal: Number(deposit.extractedTotal),
    annualExtraction: Math.round(perYear),
    annualRevenue: Math.round(annualNetRevenueOf(snapshot, context)) / CENTS_PER_UNIT,
    yearsRemaining: perYear > 0 ? Math.round(Number(deposit.reserves) / perYear) : null,
  };
}

export function toPublicResources(
  state: ResourceState & { deposits: ResourceDeposit[] },
  constants: { technology: number; infrastructure: number },
): PublicResources {
  const context: ExtractionContext = {
    extractionRate: state.extractionRate,
    technology: constants.technology,
    infrastructure: constants.infrastructure,
  };

  // Ordem do catálogo, não a do banco: a lista precisa ficar estável entre
  // leituras, senão os depósitos dançariam na tela a cada atualização.
  const deposits = RESOURCE_ORDER.flatMap((type) => {
    const deposit = state.deposits.find((candidate) => candidate.type === type);

    return deposit ? [toPublicDeposit(deposit, context)] : [];
  });

  return {
    extractionRate: state.extractionRate,
    deposits,
    annualRevenue: deposits.reduce((total, deposit) => total + deposit.annualRevenue, 0),
  };
}
