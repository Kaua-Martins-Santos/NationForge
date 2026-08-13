import { Injectable } from '@nestjs/common';
import { AGRICULTURE_DEFAULTS } from './agriculture-defaults';

/** Limite superior da semente: cabe em um Int do Postgres. */
const SEED_RANGE = 2_147_483_647;

@Injectable()
export class AgricultureService {
  /**
   * Estado inicial do domínio Agricultura, com a semente do clima sorteada.
   *
   * Devolve um objeto em vez de gravar, como os demais domínios — quem cria o
   * país grava todas as tabelas na mesma transação.
   *
   * A semente vem de `Math.random` aqui, na fundação, e é persistida. Isso não
   * conflita com o determinismo do tick (seção 25): o que precisa ser
   * reproduzível é o clima que roda sobre ela, e ele é.
   */
  buildInitialState(weatherSeed = Math.floor(Math.random() * SEED_RANGE)) {
    return { ...AGRICULTURE_DEFAULTS, weatherSeed };
  }
}
