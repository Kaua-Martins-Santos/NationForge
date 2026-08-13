import type { AgricultureState } from '../../generated/prisma/client';
import {
  annualConsumption,
  annualFarmlandCostCents,
  annualFarmlandYield,
  farmlandArea,
  type AgricultureContext,
} from './agriculture-calculations';
import { weatherAt, weatherLabel } from './weather';

const CENTS_PER_UNIT = 100;
const DAYS_PER_YEAR = 365;

/**
 * Estado agrícola pronto para sair em JSON.
 *
 * As projeções anuais vêm das mesmas funções que o tick usa. `weatherSeed` fica
 * de fora: entregá-la deixaria o jogador prever cada seca do calendário, e o
 * ponto do clima é justamente ele ser um risco a administrar.
 */
export interface PublicAgriculture {
  farmlandShare: number;
  /** Área plantada, em km². */
  farmlandArea: number;
  /** Alimento estocado, em toneladas. */
  foodStock: number;
  /**
   * Por quantos dias o estoque cobre o consumo, ignorando a produção.
   *
   * É o número que diz se uma estiagem é um susto ou uma crise — mais legível
   * que o estoque bruto, que sozinho não se compara a nada.
   */
  stockDays: number;
  /** Produção anual no tempo atual, em toneladas. */
  annualProduction: number;
  annualConsumption: number;
  /** Produção menos consumo. Negativo significa comer do estoque. */
  annualBalance: number;
  /** Custo anual de manter a lavoura, em unidades da moeda. */
  annualCost: number;
  /** Fator climático do momento e como descrevê-lo. */
  weather: number;
  weatherLabel: string;
}

export function toPublicAgriculture(
  state: AgricultureState,
  context: AgricultureContext,
): PublicAgriculture {
  const weather = weatherAt(state.weatherSeed, context.tickIndex);

  // A projeção usa o tempo de agora, não o tempo neutro: durante uma seca o
  // painel precisa mostrar a safra que o país de fato terá se nada mudar.
  const production = annualFarmlandYield(state.farmlandShare, context) * weather;
  const consumption = annualConsumption(context.population);

  const stock = Number(state.foodStock);

  return {
    farmlandShare: state.farmlandShare,
    farmlandArea: Math.round(farmlandArea(state.farmlandShare, context.territory)),
    foodStock: stock,
    stockDays: consumption > 0 ? Math.round((stock / consumption) * DAYS_PER_YEAR) : 0,
    annualProduction: Math.round(production),
    annualConsumption: Math.round(consumption),
    annualBalance: Math.round(production - consumption),
    annualCost:
      Math.round(annualFarmlandCostCents(state.farmlandShare, context.territory)) / CENTS_PER_UNIT,
    weather: Math.round(weather * 100) / 100,
    weatherLabel: weatherLabel(weather),
  };
}
