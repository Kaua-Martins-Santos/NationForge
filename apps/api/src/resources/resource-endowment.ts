import type { ResourceType } from '../../generated/prisma/enums';
import { createSeededRandom } from '../simulation/seeded-random';
import { RESOURCE_CATALOG, RESOURCE_ORDER } from './resource-catalog';

/**
 * A dotação natural de um país: quais recursos ele tem e quanto.
 *
 * ## Sorteado, mas determinístico
 *
 * Países precisam ser diferentes entre si — é o que vai dar motivo ao comércio
 * (seção 22). Mas "diferente" não pode significar "imprevisível para o teste":
 * toda a geração sai de um gerador com semente, então a mesma semente produz
 * sempre a mesma dotação.
 *
 * A semente é sorteada pelo servidor no momento da fundação e persistida. Não é
 * derivada do nome do país de propósito: se fosse, o jogador poderia tentar
 * nomes até cair numa dotação boa.
 *
 * Note que isto **não** viola a exigência de determinismo do tick (seção 25).
 * Aleatoriedade na fundação é um evento único e persistido; o que precisa ser
 * determinístico é a simulação que roda sobre o resultado.
 */

/** Mínimo de depósitos que todo país recebe, por jogabilidade. */
const MIN_DEPOSITS = 3;

export interface ResourceEndowment {
  type: ResourceType;
  reserves: bigint;
}

/**
 * Sorteia os depósitos de um país novo.
 *
 * Cada recurso é testado contra sua abundância; os que passam entram com
 * reservas dentro da faixa do catálogo. Se o sorteio for mesquinho demais, os
 * recursos mais comuns são adicionados até o país ter o mínimo jogável — um país
 * sem recurso nenhum não teria decisão a tomar nesta parte do jogo.
 */
export function generateEndowment(seed: number): ResourceEndowment[] {
  const random = createSeededRandom(seed);
  const deposits: ResourceEndowment[] = [];

  for (const type of RESOURCE_ORDER) {
    const definition = RESOURCE_CATALOG[type];

    // As duas chamadas acontecem sempre, mesmo quando o recurso não passa: o
    // gerador precisa avançar igual em todos os caminhos, senão a dotação de um
    // recurso dependeria de quais vieram antes.
    const roll = random();
    const size = random();

    if (roll > definition.abundance) {
      continue;
    }

    const { min, max } = definition.reserveRange;

    deposits.push({ type, reserves: BigInt(Math.round(min + size * (max - min))) });
  }

  for (const type of RESOURCE_ORDER) {
    if (deposits.length >= MIN_DEPOSITS) {
      break;
    }

    if (deposits.some((deposit) => deposit.type === type)) {
      continue;
    }

    // Piso da faixa: o país recebe o depósito porque precisava, não porque teve
    // sorte — então recebe o mínimo.
    deposits.push({ type, reserves: BigInt(RESOURCE_CATALOG[type].reserveRange.min) });
  }

  return deposits;
}
