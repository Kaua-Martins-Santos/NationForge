import type { Nation } from '../../generated/prisma/client';
import type { GovernmentType } from '../../generated/prisma/enums';

/**
 * Representação de um país pronta para sair em JSON.
 *
 * Existe por dois motivos:
 *
 * 1. Consistência com toPublicUser: o que sai na resposta é uma lista explícita.
 * 2. Conversão de tipos que o JSON não representa nativamente. `JSON.stringify`
 *    lança TypeError em BigInt, e o Decimal do Prisma serializaria como objeto.
 *    A conversão acontece aqui, uma vez, em vez de espalhada pelos controllers.
 */
export interface PublicNation {
  id: string;
  name: string;
  flag: string;
  capital: string;
  government: GovernmentType;
  population: number;
  territory: number;
  gdp: number;
  treasury: number;
  happiness: number;
  stability: number;
  technology: number;
  militaryPower: number;
  infrastructure: number;
  emissions: number;
  createdAt: Date;
}

export function toPublicNation(nation: Nation): PublicNation {
  return {
    id: nation.id,
    name: nation.name,
    flag: nation.flag,
    capital: nation.capital,
    government: nation.government,

    // Number é seguro aqui: o limite exato de um number é 2^53, muito acima de
    // qualquer população plausível. O BigInt no banco existe para não estourar o
    // limite de 2^31 do INTEGER do Postgres, não por precisão.
    population: Number(nation.population),
    territory: nation.territory,

    // O Decimal preserva a precisão nas contas do servidor e no banco; na
    // resposta HTTP convertemos para number para o cliente não precisar de uma
    // biblioteca de decimais só para exibir valores.
    gdp: nation.gdp.toNumber(),
    treasury: nation.treasury.toNumber(),

    happiness: nation.happiness,
    stability: nation.stability,
    technology: nation.technology,
    militaryPower: nation.militaryPower,
    infrastructure: nation.infrastructure,
    emissions: nation.emissions,
    createdAt: nation.createdAt,
  };
}
