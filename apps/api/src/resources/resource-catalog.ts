import type { ResourceType } from '../../generated/prisma/enums';

/**
 * Catálogo dos recursos naturais (CLAUDE.md seção 14).
 *
 * Um único lugar define o que cada recurso vale, quanto polui e quão comum é.
 * Adicionar um recurso ao jogo é adicionar um valor ao enum do Prisma e uma
 * entrada aqui — nenhuma regra de extração, receita ou emissão precisa mudar.
 * É o ponto de extensão que a seção 24 pede para sistemas do jogo.
 *
 * Os números são o ponto de partida do balanceamento, não verdades físicas.
 */

const CENTS_PER_UNIT = 100;

export interface ResourceDefinition {
  label: string;

  /** Preço de referência de uma unidade, em centavos. */
  basePriceCents: number;

  /**
   * Pontos de emissão por milhão de unidades extraídas.
   *
   * Combustíveis fósseis pesam; madeira e água quase não. Zero seria errado
   * mesmo para os limpos: extrair sempre custa algo ao ambiente.
   */
  emissionsPerMillion: number;

  /**
   * Chance de um país ter este recurso, de 0 a 1.
   *
   * É o que faz países serem diferentes entre si — e, portanto, o que vai dar
   * motivo ao comércio (seção 22).
   */
  abundance: number;

  /** Faixa de reservas iniciais, em unidades, quando o país tem o depósito. */
  reserveRange: { min: number; max: number };
}

export const RESOURCE_CATALOG: Record<ResourceType, ResourceDefinition> = {
  WATER: {
    label: 'Água',
    basePriceCents: 5 * CENTS_PER_UNIT,
    emissionsPerMillion: 1,
    abundance: 0.9,
    reserveRange: { min: 200_000_000, max: 900_000_000 },
  },
  TIMBER: {
    label: 'Madeira',
    basePriceCents: 30 * CENTS_PER_UNIT,
    emissionsPerMillion: 4,
    abundance: 0.75,
    reserveRange: { min: 40_000_000, max: 180_000_000 },
  },
  COAL: {
    label: 'Carvão',
    basePriceCents: 45 * CENTS_PER_UNIT,
    emissionsPerMillion: 60,
    abundance: 0.6,
    reserveRange: { min: 30_000_000, max: 140_000_000 },
  },
  IRON: {
    label: 'Ferro',
    basePriceCents: 90 * CENTS_PER_UNIT,
    emissionsPerMillion: 18,
    abundance: 0.55,
    reserveRange: { min: 20_000_000, max: 90_000_000 },
  },
  NATURAL_GAS: {
    label: 'Gás natural',
    basePriceCents: 140 * CENTS_PER_UNIT,
    emissionsPerMillion: 35,
    abundance: 0.4,
    reserveRange: { min: 12_000_000, max: 60_000_000 },
  },
  OIL: {
    label: 'Petróleo',
    basePriceCents: 260 * CENTS_PER_UNIT,
    emissionsPerMillion: 80,
    abundance: 0.35,
    reserveRange: { min: 8_000_000, max: 45_000_000 },
  },
  URANIUM: {
    label: 'Urânio',
    basePriceCents: 1_400 * CENTS_PER_UNIT,
    emissionsPerMillion: 12,
    abundance: 0.15,
    reserveRange: { min: 400_000, max: 2_500_000 },
  },
  GOLD: {
    label: 'Ouro',
    basePriceCents: 3_200 * CENTS_PER_UNIT,
    emissionsPerMillion: 25,
    abundance: 0.12,
    reserveRange: { min: 150_000, max: 900_000 },
  },
};

/**
 * Ordem de exibição e de sorteio: do mais comum ao mais raro.
 *
 * Fixa, e não derivada de `Object.keys`, porque a ordem de iteração de um objeto
 * não é contrato — e aqui ela afeta o resultado do sorteio, que precisa ser
 * reproduzível.
 */
export const RESOURCE_ORDER: readonly ResourceType[] = [
  'WATER',
  'TIMBER',
  'COAL',
  'IRON',
  'NATURAL_GAS',
  'OIL',
  'URANIUM',
  'GOLD',
];
