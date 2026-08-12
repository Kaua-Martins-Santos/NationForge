import type { PopulationState } from '../../generated/prisma/client';
import { employedFrom } from './population-growth';

/**
 * Estado demográfico pronto para sair em JSON.
 *
 * `growthCarryMicro` fica de fora: é detalhe interno da simulação, sem
 * significado para quem joga. O marco temporal também não está aqui — ele é do
 * país inteiro, e sai uma vez em `PublicNation.simulatedUntil`.
 */
export interface PublicPopulation {
  total: number;
  employed: number;
  unemployed: number;
  /** Percentual de 0 a 100, arredondado para uma casa. */
  unemploymentRate: number;
  birthRatePerThousand: number;
  deathRatePerThousand: number;
  health: number;
  education: number;
}

export function toPublicPopulation(state: PopulationState): PublicPopulation {
  const total = Number(state.total);
  const employed = Number(employedFrom(state.total, state.education));
  const unemployed = total - employed;

  return {
    total,
    employed,
    unemployed,
    unemploymentRate: total === 0 ? 0 : Math.round((unemployed / total) * 1000) / 10,
    birthRatePerThousand: state.birthRatePerThousand,
    deathRatePerThousand: state.deathRatePerThousand,
    health: state.health,
    education: state.education,
  };
}
