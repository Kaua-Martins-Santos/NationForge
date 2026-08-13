import { Injectable } from '@nestjs/common';
import { GOOD_ORDER } from './good-catalog';
import { PRODUCTION_DEFAULTS } from './production-defaults';

@Injectable()
export class ProductionService {
  /**
   * Linhas de produção de um país novo: uma por bem do catálogo.
   *
   * Devolve um objeto em vez de gravar, como os demais domínios — quem cria o
   * país grava todas as tabelas na mesma transação.
   *
   * Cria linha inclusive para bens cujo insumo o país não tem. A linha é a
   * *decisão*, e ela continua existindo: quando o comércio (Fase 23) trouxer o
   * ferro que falta, a siderurgia já está configurada.
   */
  buildInitialLines() {
    return GOOD_ORDER.map((good) => ({ good, allocation: PRODUCTION_DEFAULTS.allocation }));
  }
}
