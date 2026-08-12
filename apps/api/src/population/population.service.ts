import { Injectable } from '@nestjs/common';
import { POPULATION_DEFAULTS } from './population-defaults';

@Injectable()
export class PopulationService {
  /**
   * Dados iniciais do estado demográfico de um país novo.
   *
   * Devolve um objeto em vez de gravar: quem cria o país precisa gravar todas as
   * tabelas na mesma transação, então a escrita fica com ele.
   *
   * Avançar a população no tempo **não** é responsabilidade deste service: desde
   * que a economia passou a depender da demografia, os domínios avançam juntos
   * no mesmo laço (ver `simulation/simulate.ts`).
   */
  buildInitialState() {
    return { ...POPULATION_DEFAULTS };
  }
}
