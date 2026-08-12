import type { EconomyState } from '../../generated/prisma/client';
import {
  annualExpensesCents,
  annualRevenueCents,
  gdpCents,
  type EconomyContext,
} from './economy-calculations';

const CENTS_PER_UNIT = 100;

/**
 * Estado econômico pronto para sair em JSON.
 *
 * Valores monetários saem em unidades da moeda (não em centavos): centavos são a
 * representação interna que garante aritmética exata, não algo que interesse a
 * quem joga. `treasuryCarryMicro` fica de fora pelo mesmo motivo.
 *
 * As projeções anuais existem para que a decisão do jogador seja informada: sem
 * ver receita e despesa lado a lado, escolher uma alíquota seria adivinhação.
 * São derivadas das mesmas funções que o tick usa — não há uma segunda fórmula
 * para o que o jogador vê.
 */
export interface PublicEconomy {
  treasury: number;
  taxRate: number;
  /** PIB anual, derivado da força de trabalho e da produtividade. */
  gdp: number;
  annualRevenue: number;
  annualExpenses: number;
  /** Receita menos despesa. Negativo quando o país gasta mais do que arrecada. */
  annualBalance: number;
}

function toUnits(cents: number): number {
  return Math.round(cents) / CENTS_PER_UNIT;
}

export function toPublicEconomy(state: EconomyState, context: EconomyContext): PublicEconomy {
  const revenue = annualRevenueCents(state.taxRate, context);
  const expenses = annualExpensesCents(context);

  return {
    treasury: toUnits(Number(state.treasuryCents)),
    taxRate: state.taxRate,
    gdp: toUnits(Number(gdpCents(context))),
    annualRevenue: toUnits(revenue),
    annualExpenses: toUnits(expenses),
    annualBalance: toUnits(revenue - expenses),
  };
}
