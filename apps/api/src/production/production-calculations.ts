/**
 * Regras de produção — funções puras, sem banco e sem aleatoriedade (seção 25).
 *
 * ## A decisão: vender bruto ou beneficiar
 *
 * Até a Fase 12, tudo que saía do solo era vendido como saiu. Aqui o país pode
 * desviar parte do que extrai para a indústria: dois ferros viram um aço, e o
 * aço vale bem mais que os dois ferros que o formaram.
 *
 * Se fosse só isso, a resposta seria óbvia — processar tudo, sempre. Duas coisas
 * impedem:
 *
 * 1. **Capacidade industrial.** Um país só processa o que seu parque industrial
 *    dá conta. O que passa disso continua sendo vendido bruto: a fila não é
 *    perdida, mas também não vira bem.
 * 2. **Emissões.** Beneficiar polui bem mais que extrair.
 *
 * Então industrializar não é um botão — é consequência de ter gente empregada,
 * tecnologia e infraestrutura, que são justamente o que o resto do jogo constrói.
 *
 * ## A produção consome o fluxo, não a reserva
 *
 * O insumo disponível em um tick é o que foi **extraído naquele tick**, não o que
 * está no solo. Isso mantém um dono único para cada fato: quem mexe em reservas é
 * o domínio Recursos, e a produção só decide o destino do que já saiu.
 */

import type { GoodType, ResourceType } from '../../generated/prisma/enums';
import { RESOURCE_CATALOG } from '../resources/resource-catalog';
import { MICRO, settleCarry, TICKS_PER_YEAR } from '../simulation/tick';
import { GOOD_CATALOG, GOOD_ORDER, MAX_ALLOCATION } from './good-catalog';

const INDEX_MAX = 100;
const MILLION = 1_000_000;

/**
 * Unidades de insumo que um trabalhador processa por ano, sem tecnologia nem
 * infraestrutura.
 *
 * Calibrado contra o volume que a extração entrega: no país inicial, a
 * capacidade cobre confortavelmente uma alocação moderada, mas fica abaixo do
 * que sairia com tudo no máximo. É o que faz o teto ser sentido justamente
 * quando o jogador tenta industrializar de vez.
 *
 * A força de trabalho serve de proxy para o tamanho do parque industrial. Quando
 * a indústria tiver fábricas de verdade (Fase 15), a capacidade passa a vir
 * delas — e esta constante sai.
 */
const BASE_ANNUAL_INPUT_PER_WORKER = 8;

/**
 * Peso de tecnologia e infraestrutura na capacidade. Nos valores máximos o país
 * processa 2x o piso — os mesmos pesos da extração, porque é o mesmo tipo de
 * ganho: desenvolver o país aumenta o que ele consegue fazer com o que tem.
 */
const CAPACITY_WEIGHTS = { technology: 0.6, infrastructure: 0.4 } as const;

/**
 * Parcela do valor do bem que se perde em custo de processamento.
 *
 * Fábrica tem folha de pagamento, manutenção e perdas. É o que impede que
 * beneficiar seja dinheiro grátis — e o que deixa margem para, mais adiante,
 * energia cara tornar a conta desfavorável.
 */
const PROCESSING_COST_SHARE = 0.2;

export interface ProductionLineSnapshot {
  good: GoodType;
  /** Quanto do insumo extraído vai para a fábrica, 0 a 100. */
  allocation: number;
  producedTotal: bigint;
  productionCarryMicro: number;
}

/** Fatores de outros domínios que a produção consome. */
export interface ProductionContext {
  /** Habitantes empregados — o proxy do tamanho do parque industrial. */
  employed: bigint;
  technology: number;
  infrastructure: number;
}

/** O que uma linha produziu em um período. */
export interface ProductionLineDelta {
  good: GoodType;
  /** Unidades de insumo desviadas da venda bruta. */
  consumed: number;
  /** Unidades do bem fabricadas. */
  produced: number;
  revenueCents: number;
  processingCostCents: number;
  /** O que a venda in natura do insumo teria rendido. */
  forgoneRawRevenueCents: number;
  /**
   * Quanto beneficiar rendeu **a mais** que vender bruto.
   *
   * É este número, e não a receita, que a economia recebe: a receita da venda
   * bruta já foi contabilizada pela extração. Somar a receita cheia contaria o
   * mesmo insumo duas vezes.
   */
  valueAddedCents: number;
  emissions: number;
}

/** Quanto de insumo o país processa por ano nas condições atuais. */
export function annualProcessingCapacity(context: ProductionContext): number {
  const multiplier =
    1 +
    (context.technology / INDEX_MAX) * CAPACITY_WEIGHTS.technology +
    (context.infrastructure / INDEX_MAX) * CAPACITY_WEIGHTS.infrastructure;

  return Number(context.employed) * BASE_ANNUAL_INPUT_PER_WORKER * multiplier;
}

/**
 * O que sai de uma linha ao processar uma quantidade de insumo.
 *
 * Vale para qualquer unidade de tempo: passando o consumo de um tick, descreve um
 * tick; passando o de um ano, descreve o ano. É o que permite às projeções da
 * tela usarem exatamente a mesma fórmula do tick, sem uma segunda versão dela.
 */
export function lineEconomics(good: GoodType, consumed: number): Omit<ProductionLineDelta, 'good'> {
  const definition = GOOD_CATALOG[good];

  const produced = consumed / definition.inputPerUnit;
  const revenueCents = produced * definition.basePriceCents;
  const processingCostCents = revenueCents * PROCESSING_COST_SHARE;
  const forgoneRawRevenueCents = consumed * RESOURCE_CATALOG[definition.input].basePriceCents;

  return {
    consumed,
    produced,
    revenueCents,
    processingCostCents,
    forgoneRawRevenueCents,
    valueAddedCents: revenueCents - processingCostCents - forgoneRawRevenueCents,
    emissions: (produced / MILLION) * definition.emissionsPerMillion,
  };
}

/** Quanto de insumo cada linha vai processar, já respeitando o teto do país. */
export interface ProductionPlan {
  /** Insumo consumido por linha, na ordem do catálogo. */
  consumed: Map<GoodType, number>;
  /** Quanto as alocações pediram, antes do teto. */
  demanded: number;
  /** Quanto de fato será processado. */
  processed: number;
}

/**
 * Distribui a capacidade entre as linhas.
 *
 * Quando a demanda passa do teto, **todas** as linhas encolhem na mesma
 * proporção. A alternativa seria atender por ordem de prioridade, o que exigiria
 * inventar uma prioridade — e faria a última linha da fila depender de qual
 * posição ocupa no catálogo, algo que o jogador não escolheu nem enxerga.
 *
 * `available` e `capacity` precisam estar na mesma unidade de tempo. É a mesma
 * função que serve ao tick e à projeção anual.
 */
export function planProduction(
  lines: readonly ProductionLineSnapshot[],
  available: ReadonlyMap<ResourceType, number>,
  capacity: number,
): ProductionPlan {
  const demand = new Map<GoodType, number>();
  let demanded = 0;

  for (const good of GOOD_ORDER) {
    const line = lines.find((candidate) => candidate.good === good);

    if (!line || line.allocation <= 0) {
      continue;
    }

    // Cada bem consome um recurso diferente (garantido por teste), então uma
    // linha nunca disputa insumo com outra — só capacidade.
    const input = available.get(GOOD_CATALOG[good].input) ?? 0;
    const wanted = input * (line.allocation / MAX_ALLOCATION);

    if (wanted <= 0) {
      continue;
    }

    demand.set(good, wanted);
    demanded += wanted;
  }

  const factor = demanded > capacity ? capacity / demanded : 1;

  const consumed = new Map<GoodType, number>();
  let processed = 0;

  for (const [good, wanted] of demand) {
    const amount = wanted * factor;

    consumed.set(good, amount);
    processed += amount;
  }

  return { consumed, demanded, processed };
}

export interface ProductionTickResult {
  lines: ProductionLineSnapshot[];
  deltas: ProductionLineDelta[];
  /** Ganho sobre vender tudo in natura — o que a economia recebe. */
  valueAddedCents: number;
  produced: number;
  emissions: number;
}

/**
 * Aplica um tick de produção a todas as linhas do país.
 *
 * `available` traz o que a extração entregou **neste tick**, por recurso. Como na
 * extração e na população, a aritmética guarda o resto fracionário: com alocação
 * baixa, uma hora produz muito menos de uma unidade, e arredondar descartaria
 * tudo — o total produzido nunca sairia do zero.
 */
export function applyProductionTick(
  lines: readonly ProductionLineSnapshot[],
  available: ReadonlyMap<ResourceType, number>,
  context: ProductionContext,
): ProductionTickResult {
  const plan = planProduction(lines, available, annualProcessingCapacity(context) / TICKS_PER_YEAR);

  const deltas: ProductionLineDelta[] = [];
  let valueAddedCents = 0;
  let produced = 0;
  let emissions = 0;

  const nextLines = lines.map((line) => {
    const consumed = plan.consumed.get(line.good) ?? 0;

    if (consumed <= 0) {
      return line;
    }

    const economics = lineEconomics(line.good, consumed);

    const { whole, remainderMicro } = settleCarry(
      line.productionCarryMicro + Math.round(economics.produced * MICRO),
    );

    deltas.push({ good: line.good, ...economics });
    valueAddedCents += economics.valueAddedCents;
    produced += economics.produced;
    emissions += economics.emissions;

    return {
      ...line,
      producedTotal: line.producedTotal + BigInt(whole),
      productionCarryMicro: remainderMicro,
    };
  });

  return { lines: nextLines, deltas, valueAddedCents, produced, emissions };
}
