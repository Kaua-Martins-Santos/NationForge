import { Injectable } from '@nestjs/common';
import type {
  EconomyState,
  Nation,
  PopulationState,
  ProductionLine,
  ResourceDeposit,
  ResourceState,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { simulateNation } from './simulate';

/** Um país com todos os domínios simulados carregados. */
export interface SimulatedNation {
  nation: Nation;
  population: PopulationState;
  economy: EconomyState;
  resources: ResourceState & { deposits: ResourceDeposit[] };
  production: ProductionLine[];
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
    const { nation, population, economy, resources, production } = input;

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
        deposits: resources.deposits.map((deposit) => ({
          type: deposit.type,
          reserves: deposit.reserves,
          extractedTotal: deposit.extractedTotal,
          extractionCarryMicro: deposit.extractionCarryMicro,
        })),
        extractionRate: resources.extractionRate,
        productionLines: production.map((line) => ({
          good: line.good,
          allocation: line.allocation,
          producedTotal: line.producedTotal,
          productionCarryMicro: line.productionCarryMicro,
        })),
        happiness: nation.happiness,
        happinessCarryMicro: nation.happinessCarryMicro,
        emissions: nation.emissions,
        emissionsCarryMicro: nation.emissionsCarryMicro,
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

    // As listas (depósitos, linhas de produção) são casadas pelo que as torna
    // únicas dentro do país — o tipo do recurso e o bem —, nunca pela posição:
    // casar por índice passaria a gravar no registro errado no dia em que a
    // simulação filtrasse ou reordenasse a lista.
    //
    // O novo estado de cada uma é montado aqui, e não lido de volta da
    // transação: só o que se moveu é gravado, então a resposta do banco não
    // corresponderia à lista inteira.
    const updatedDeposits = resources.deposits.map((deposit) => {
      const next = result.state.deposits.find((candidate) => candidate.type === deposit.type);

      return next ? { ...deposit, ...next } : deposit;
    });

    const updatedProduction = production.map((line) => {
      const next = result.state.productionLines.find((candidate) => candidate.good === line.good);

      return next ? { ...line, ...next } : line;
    });

    const depositUpdates = updatedDeposits.map((deposit) =>
      this.prisma.resourceDeposit.update({
        where: { id: deposit.id },
        data: {
          reserves: deposit.reserves,
          extractedTotal: deposit.extractedTotal,
          extractionCarryMicro: deposit.extractionCarryMicro,
        },
      }),
    );

    const productionUpdates = updatedProduction.flatMap((line, index) => {
      const before = production[index]!;

      // Linha parada (alocação zero, ou sem o insumo) não muda nada — gravar
      // mesmo assim gastaria um UPDATE por leitura e mentiria no `updatedAt`.
      // Os depósitos não precisam do mesmo cuidado: com extração parada eles
      // também não mudam, mas a lista costuma ser curta e sempre ativa.
      if (
        before.producedTotal === line.producedTotal &&
        before.productionCarryMicro === line.productionCarryMicro
      ) {
        return [];
      }

      return [
        this.prisma.productionLine.update({
          where: { id: line.id },
          data: {
            producedTotal: line.producedTotal,
            productionCarryMicro: line.productionCarryMicro,
          },
        }),
      ];
    });

    // Transação: todos os registros descrevem o mesmo instante da simulação.
    // Gravar só parte deles deixaria o país com a população de um momento e o
    // tesouro de outro — e o marco temporal decidiria qual dos dois se perde.
    const [updatedNation, updatedPopulation, updatedEconomy] = await this.prisma.$transaction([
      this.prisma.nation.update({
        where: { id: nation.id },
        data: {
          happiness: result.state.happiness,
          happinessCarryMicro: result.state.happinessCarryMicro,
          emissions: result.state.emissions,
          emissionsCarryMicro: result.state.emissionsCarryMicro,
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
      ...depositUpdates,
      ...productionUpdates,
    ]);

    return {
      nation: updatedNation,
      population: updatedPopulation,
      economy: updatedEconomy,
      resources: { ...resources, deposits: updatedDeposits },
      production: updatedProduction,
    };
  }
}
