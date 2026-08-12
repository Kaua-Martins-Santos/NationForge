import { Injectable } from '@nestjs/common';
import type { Nation, PopulationState } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { POPULATION_DEFAULTS } from './population-defaults';
import { projectPopulation } from './population-growth';

@Injectable()
export class PopulationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dados iniciais do estado demográfico de um país novo.
   *
   * Devolve um objeto em vez de gravar: quem cria o país precisa gravar as duas
   * tabelas na mesma transação, então a escrita fica com ele.
   */
  buildInitialState(now: Date) {
    return { ...POPULATION_DEFAULTS, simulatedUntil: now };
  }

  /**
   * Põe a simulação em dia e persiste o resultado.
   *
   * Chamado na leitura do país: é assim que a nação evolui enquanto o jogador
   * está offline, sem manter processo algum rodando (CLAUDE.md seção 26).
   *
   * Quando nenhum tick inteiro passou, nada é gravado — evita um UPDATE por
   * request e mantém `updatedAt` significando "houve mudança de fato".
   */
  async advance(nation: Nation, state: PopulationState, now: Date): Promise<PopulationState> {
    const projection = projectPopulation(
      {
        total: state.total,
        growthCarryMicro: state.growthCarryMicro,
        birthRatePerThousand: state.birthRatePerThousand,
        deathRatePerThousand: state.deathRatePerThousand,
        health: state.health,
      },
      { happiness: nation.happiness },
      state.simulatedUntil,
      now,
    );

    if (projection.appliedTicks === 0) {
      return state;
    }

    return this.prisma.populationState.update({
      where: { id: state.id },
      data: {
        total: projection.total,
        growthCarryMicro: projection.growthCarryMicro,
        simulatedUntil: projection.simulatedUntil,
      },
    });
  }
}
