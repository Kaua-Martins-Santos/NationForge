import type { ProductionLine, ResourceDeposit } from '../../generated/prisma/client';
import type { GoodType, ResourceType } from '../../generated/prisma/enums';
import { RESOURCE_CATALOG } from '../resources/resource-catalog';
import { annualExtraction } from '../resources/resource-extraction';
import { GOOD_CATALOG, GOOD_ORDER } from './good-catalog';
import {
  annualProcessingCapacity,
  lineEconomics,
  planProduction,
  type ProductionContext,
} from './production-calculations';

const CENTS_PER_UNIT = 100;

/**
 * Uma linha de produção pronta para sair em JSON.
 *
 * Traz as projeções anuais junto: sem saber quanto uma linha rende a mais que
 * vender o insumo bruto, a alocação seria escolhida no escuro. As projeções saem
 * das mesmas funções que o tick — não existe uma segunda fórmula para o que o
 * jogador vê.
 */
export interface PublicProductionLine {
  good: GoodType;
  label: string;
  input: ResourceType;
  inputLabel: string;
  inputPerUnit: number;
  allocation: number;
  producedTotal: number;
  /** Unidades do bem por ano na configuração atual, já limitadas pelo teto. */
  annualProduction: number;
  /** Insumo desviado por ano da venda bruta. */
  annualInputConsumed: number;
  /** Quanto beneficiar rende **a mais** que vender bruto, por ano. */
  annualValueAdded: number;
  /** Se o país não tem o depósito, a linha existe mas não pode produzir. */
  hasInput: boolean;
}

export interface PublicProduction {
  lines: PublicProductionLine[];
  /** Soma do ganho anual de todas as linhas. */
  annualValueAdded: number;
  /** Insumo que o país consegue processar por ano. */
  annualCapacity: number;
  /** Insumo que as alocações atuais pedem por ano. */
  annualDemand: number;
  /**
   * Quanto da capacidade a configuração atual ocupa, em porcentagem.
   *
   * Passa de 100 quando o país pede mais do que consegue processar — e é
   * justamente esse excesso que o jogador precisa enxergar, então o número não é
   * limitado a 100.
   */
  capacityUsage: number;
}

/** Contexto que as projeções precisam: produção depende de recursos e de gente. */
export interface ProductionProjectionContext extends ProductionContext {
  extractionRate: number;
}

export function toPublicProduction(
  lines: ProductionLine[],
  deposits: ResourceDeposit[],
  context: ProductionProjectionContext,
): PublicProduction {
  // O insumo disponível por ano é o que a extração entrega por ano — a mesma
  // função que o tick usa, só que na escala anual.
  const available = new Map<ResourceType, number>(
    deposits.map((deposit) => [
      deposit.type,
      annualExtraction(deposit.reserves, {
        extractionRate: context.extractionRate,
        technology: context.technology,
        infrastructure: context.infrastructure,
      }),
    ]),
  );

  const capacity = annualProcessingCapacity(context);
  const plan = planProduction(lines, available, capacity);

  // Ordem do catálogo, não a do banco: a lista precisa ficar estável entre
  // leituras, senão as linhas dançariam na tela a cada atualização.
  const publicLines = GOOD_ORDER.flatMap((good) => {
    const line = lines.find((candidate) => candidate.good === good);

    if (!line) {
      return [];
    }

    const definition = GOOD_CATALOG[good];
    const economics = lineEconomics(good, plan.consumed.get(good) ?? 0);

    return [
      {
        good,
        label: definition.label,
        input: definition.input,
        inputLabel: RESOURCE_CATALOG[definition.input].label,
        inputPerUnit: definition.inputPerUnit,
        allocation: line.allocation,
        producedTotal: Number(line.producedTotal),
        annualProduction: Math.round(economics.produced),
        annualInputConsumed: Math.round(economics.consumed),
        annualValueAdded: Math.round(economics.valueAddedCents) / CENTS_PER_UNIT,
        hasInput: available.has(definition.input),
      },
    ];
  });

  return {
    lines: publicLines,
    annualValueAdded: publicLines.reduce((total, line) => total + line.annualValueAdded, 0),
    annualCapacity: Math.round(capacity),
    annualDemand: Math.round(plan.demanded),
    capacityUsage: capacity > 0 ? Math.round((plan.demanded / capacity) * 100) : 0,
  };
}
