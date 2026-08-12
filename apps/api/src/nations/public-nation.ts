import type { GovernmentType } from '../../generated/prisma/enums';
import { toPublicEconomy, type PublicEconomy } from '../economy/public-economy';
import { employedFrom } from '../population/population-growth';
import { toPublicPopulation, type PublicPopulation } from '../population/public-population';
import { toPublicResources, type PublicResources } from '../resources/public-resources';
import type { SimulatedNation } from '../simulation/simulation.service';

/**
 * Representação de um país pronta para sair em JSON.
 *
 * Existe por dois motivos:
 *
 * 1. Controle explícito do que sai. Campos internos da simulação (os `carry`, o
 *    marco temporal) não vazam por acidente ao adicionar colunas.
 * 2. Conversão de tipos que o JSON não representa nativamente. `JSON.stringify`
 *    lança TypeError em BigInt, então a conversão acontece aqui, uma vez, em vez
 *    de espalhada pelos controllers.
 *
 * Cada domínio aninha seu próprio objeto (`population`, `economy`), espelhando na
 * resposta a separação que existe no banco.
 */
export interface PublicNation {
  id: string;
  name: string;
  flag: string;
  capital: string;
  government: GovernmentType;
  territory: number;
  happiness: number;
  stability: number;
  technology: number;
  militaryPower: number;
  infrastructure: number;
  emissions: number;
  createdAt: Date;
  population: PublicPopulation;
  economy: PublicEconomy;
  resources: PublicResources;
  /** Até quando a simulação está aplicada — o "as of" de todos os números acima. */
  simulatedUntil: string;
}

export function toPublicNation({
  nation,
  population,
  economy,
  resources,
}: SimulatedNation): PublicNation {
  return {
    id: nation.id,
    name: nation.name,
    flag: nation.flag,
    capital: nation.capital,
    government: nation.government,
    territory: nation.territory,
    happiness: nation.happiness,
    stability: nation.stability,
    technology: nation.technology,
    militaryPower: nation.militaryPower,
    infrastructure: nation.infrastructure,
    emissions: nation.emissions,
    createdAt: nation.createdAt,

    population: toPublicPopulation(population),

    // A economia precisa do contexto dos outros domínios porque o PIB é
    // derivado, não armazenado.
    economy: toPublicEconomy(economy, {
      employed: employedFrom(population.total, population.education),
      population: population.total,
      technology: nation.technology,
      infrastructure: nation.infrastructure,
      education: population.education,
    }),

    resources: toPublicResources(resources, {
      technology: nation.technology,
      infrastructure: nation.infrastructure,
    }),

    simulatedUntil: nation.simulatedUntil.toISOString(),
  };
}
