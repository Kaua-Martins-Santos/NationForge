import { Injectable } from '@nestjs/common';
import type { EconomyState, Nation, PopulationState } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { simulateNation } from './simulate';

/** Um país com todos os domínios simulados carregados. */
export interface SimulatedNation {
  nation: Nation;
  population: PopulationState;
  economy: EconomyState;
}

/**
 * Põe a simulação de um país em dia e persiste o resultado.
 *
 * Esta classe é a fronteira entre a regra pura (`simulate.ts`, que não sabe o
 * que é banco) e a persistência. Toda a decisão de *o que acontece* está lá; o
 * que está aqui é apenas *como isso é gravado*.
 */
@Injectable()
export class SimulationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Avança o país até `now` e grava o novo estado.
   *
   * Chamado na leitura do país: é assim que a nação evolui enquanto o jogador
   * está offline, sem manter processo algum rodando (CLAUDE.md seção 26).
   */
  async advance(input: SimulatedNation, now: Date): Promise<SimulatedNation> {
    const { nation, population, economy } = input;

    const result = simulateNation(
      {
        population: {
          total: population.total,
          growthCarryMicro: population.growthCarryMicro,
          birthRatePerThousand: population.birthRatePerThousand,
          deathRatePerThousand: population.deathRatePerThousand,
          health: population.health,
          education: population.education,
        },
        economy: {
          treasuryCents: economy.treasuryCents,
          treasuryCarryMicro: economy.treasuryCarryMicro,
          taxRate: economy.taxRate,
        },
        happiness: nation.happiness,
        happinessCarryMicro: nation.happinessCarryMicro,
      },
      { technology: nation.technology, infrastructure: nation.infrastructure },
      nation.simulatedUntil,
      now,
    );

    // Quando nenhum tick inteiro passou, nada é gravado — evita um UPDATE por
    // request e mantém `updatedAt` significando "houve mudança de fato".
    if (result.appliedTicks === 0) {
      return input;
    }

    // Transação: os três registros descrevem o mesmo instante da simulação.
    // Gravar só parte deles deixaria o país com a população de um momento e o
    // tesouro de outro — e o marco temporal decidiria qual dos dois se perde.
    const [updatedNation, updatedPopulation, updatedEconomy] = await this.prisma.$transaction([
      this.prisma.nation.update({
        where: { id: nation.id },
        data: {
          happiness: result.state.happiness,
          happinessCarryMicro: result.state.happinessCarryMicro,
          simulatedUntil: result.simulatedUntil,
        },
      }),
      this.prisma.populationState.update({
        where: { id: population.id },
        data: {
          total: result.state.population.total,
          growthCarryMicro: result.state.population.growthCarryMicro,
        },
      }),
      this.prisma.economyState.update({
        where: { id: economy.id },
        data: {
          treasuryCents: result.state.economy.treasuryCents,
          treasuryCarryMicro: result.state.economy.treasuryCarryMicro,
        },
      }),
    ]);

    return { nation: updatedNation, population: updatedPopulation, economy: updatedEconomy };
  }
}
