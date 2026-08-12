import { Injectable } from '@nestjs/common';
import { ECONOMY_DEFAULTS } from './economy-defaults';

@Injectable()
export class EconomyService {
  /**
   * Dados iniciais do estado econômico de um país novo.
   *
   * Devolve um objeto em vez de gravar: quem cria o país precisa gravar todas as
   * tabelas na mesma transação, então a escrita fica com ele.
   */
  buildInitialState() {
    return { ...ECONOMY_DEFAULTS };
  }
}
