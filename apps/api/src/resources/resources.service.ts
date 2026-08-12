import { Injectable } from '@nestjs/common';
import { RESOURCE_DEFAULTS } from './resource-defaults';
import { generateEndowment } from './resource-endowment';

/** Limite superior da semente: cabe em um Int do Postgres. */
const SEED_RANGE = 2_147_483_647;

@Injectable()
export class ResourcesService {
  /**
   * Estado inicial do domínio Recursos, com a dotação natural já sorteada.
   *
   * Devolve um objeto em vez de gravar: quem cria o país precisa gravar todas as
   * tabelas na mesma transação, então a escrita fica com ele.
   *
   * A semente vem de `Math.random` **aqui**, na fundação, e é persistida. Isso
   * não conflita com o determinismo exigido do tick (seção 25): o que precisa
   * ser reproduzível é a simulação que roda sobre a dotação, e ela é.
   */
  buildInitialState(seed = Math.floor(Math.random() * SEED_RANGE)) {
    return {
      ...RESOURCE_DEFAULTS,
      seed,
      deposits: {
        create: generateEndowment(seed).map((deposit) => ({
          type: deposit.type,
          reserves: deposit.reserves,
        })),
      },
    };
  }
}
