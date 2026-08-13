import type { GoodType, ResourceType } from '../../generated/prisma/enums';

/**
 * Catálogo dos bens manufaturados (CLAUDE.md seção 16).
 *
 * Um bem é uma **receita**: entra um recurso, sai algo que vale mais. Adicionar
 * um bem ao jogo é adicionar um valor ao enum do Prisma e uma entrada aqui —
 * nenhuma regra de produção, receita ou emissão precisa mudar. É o mesmo ponto
 * de extensão do catálogo de recursos.
 *
 * ## Por que as receitas ainda não consomem energia
 *
 * Uma siderúrgica de verdade queima energia, e a seção 16 pede isso. Mas energia
 * é a Fase 16, e um insumo que ainda não existe só poderia ser fingido. Quando o
 * domínio existir, `inputPerUnit` ganha companhia — a estrutura já comporta.
 *
 * Os números são o ponto de partida do balanceamento, não verdades industriais.
 */

const CENTS_PER_UNIT = 100;

export interface GoodDefinition {
  label: string;

  /** O recurso consumido pela receita. */
  input: ResourceType;

  /** Unidades do insumo gastas para fabricar uma unidade do bem. */
  inputPerUnit: number;

  /**
   * Preço de referência de uma unidade do bem, em centavos.
   *
   * Calibrado contra o insumo, não escolhido no vácuo: cada preço é ~2x o valor
   * bruto do insumo que a receita consome. Descontado o custo de processamento,
   * beneficiar rende perto do dobro de vender in natura — o suficiente para a
   * decisão valer a pena, e não tanto que vender bruto vire erro óbvio.
   */
  basePriceCents: number;

  /**
   * Pontos de emissão por milhão de unidades **produzidas**.
   *
   * Note a diferença para o catálogo de recursos, onde a conta é por unidade
   * extraída: aqui o volume de saída é menor que o de entrada, então os números
   * parecem maiores sem que a poluição seja desproporcional.
   *
   * Beneficiar sempre polui mais que só extrair — é o custo ambiental que a
   * decisão desta fase carrega.
   */
  emissionsPerMillion: number;
}

export const GOOD_CATALOG: Record<GoodType, GoodDefinition> = {
  PLANKS: {
    label: 'Madeira serrada',
    input: 'TIMBER',
    inputPerUnit: 3,
    basePriceCents: 185 * CENTS_PER_UNIT,
    emissionsPerMillion: 20,
  },
  STEEL: {
    label: 'Aço',
    input: 'IRON',
    inputPerUnit: 2,
    basePriceCents: 370 * CENTS_PER_UNIT,
    emissionsPerMillion: 150,
  },
  FUEL: {
    label: 'Combustível',
    input: 'OIL',
    inputPerUnit: 1,
    basePriceCents: 540 * CENTS_PER_UNIT,
    emissionsPerMillion: 220,
  },
};

/**
 * Ordem de exibição e de cálculo: do insumo mais comum ao mais raro.
 *
 * Fixa, e não derivada de `Object.keys`, pelo mesmo motivo do catálogo de
 * recursos — a ordem de iteração de um objeto não é contrato, e aqui ela decide
 * a ordem em que as linhas aparecem na tela.
 */
export const GOOD_ORDER: readonly GoodType[] = ['PLANKS', 'STEEL', 'FUEL'];

export const MIN_ALLOCATION = 0;
export const MAX_ALLOCATION = 100;
