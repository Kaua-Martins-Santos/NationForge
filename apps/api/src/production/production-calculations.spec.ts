import type { ResourceType } from '../../generated/prisma/enums';
import { TICKS_PER_YEAR } from '../simulation/tick';
import { GOOD_CATALOG, GOOD_ORDER } from './good-catalog';
import {
  annualProcessingCapacity,
  applyProductionTick,
  lineEconomics,
  planProduction,
  type ProductionContext,
  type ProductionLineSnapshot,
} from './production-calculations';

const CONTEXT: ProductionContext = {
  employed: 580_000n,
  technology: 10,
  infrastructure: 10,
};

function line(good: (typeof GOOD_ORDER)[number], allocation: number): ProductionLineSnapshot {
  return { good, allocation, producedTotal: 0n, productionCarryMicro: 0 };
}

/** Insumo abundante o bastante para nenhum teste esbarrar em falta de matéria-prima. */
function available(entries: Partial<Record<ResourceType, number>>): Map<ResourceType, number> {
  return new Map(Object.entries(entries) as [ResourceType, number][]);
}

describe('catálogo de bens', () => {
  /**
   * `planProduction` calcula a demanda de cada linha direto sobre o insumo
   * disponível, o que só é correto porque duas linhas nunca disputam o mesmo
   * recurso. Se um bem novo repetir um insumo, a soma passaria do que foi
   * extraído — e o país produziria a partir de matéria-prima inexistente.
   */
  it('cada bem consome um recurso diferente', () => {
    const inputs = GOOD_ORDER.map((good) => GOOD_CATALOG[good].input);

    expect(new Set(inputs).size).toBe(inputs.length);
  });
});

describe('lineEconomics', () => {
  /**
   * A calibração que dá sentido à fase: se beneficiar rendesse menos que vender
   * bruto, a decisão teria uma resposta única e o domínio inteiro seria enfeite.
   */
  it('beneficiar rende mais que vender o insumo bruto, para todo bem', () => {
    for (const good of GOOD_ORDER) {
      const economics = lineEconomics(good, 1_000);

      expect(economics.valueAddedCents).toBeGreaterThan(0);

      // Teto de sanidade: um preço digitado com um zero a mais faria o ganho
      // superar o próprio valor do insumo, e a extração viraria detalhe.
      expect(economics.valueAddedCents).toBeLessThan(economics.forgoneRawRevenueCents);
    }
  });

  it('não produz, não gasta e não polui sem insumo', () => {
    expect(lineEconomics('STEEL', 0)).toEqual({
      consumed: 0,
      produced: 0,
      revenueCents: 0,
      processingCostCents: 0,
      forgoneRawRevenueCents: 0,
      valueAddedCents: 0,
      emissions: 0,
    });
  });

  it('converte o insumo na proporção da receita', () => {
    expect(lineEconomics('STEEL', 1_000).produced).toBe(1_000 / GOOD_CATALOG.STEEL.inputPerUnit);
  });
});

describe('annualProcessingCapacity', () => {
  it('cresce com tecnologia e infraestrutura', () => {
    const atrasado = annualProcessingCapacity({ ...CONTEXT, technology: 0, infrastructure: 0 });
    const avancado = annualProcessingCapacity({ ...CONTEXT, technology: 100, infrastructure: 100 });

    expect(avancado).toBeGreaterThan(atrasado);
    // Os pesos somam 1, então o país desenvolvido processa o dobro do piso.
    expect(avancado).toBeCloseTo(atrasado * 2);
  });

  it('um país sem ninguém empregado não processa nada', () => {
    expect(annualProcessingCapacity({ ...CONTEXT, employed: 0n })).toBe(0);
  });
});

describe('planProduction', () => {
  const insumos = available({ IRON: 1_000, OIL: 1_000, TIMBER: 1_000 });

  it('desvia a fração alocada do insumo', () => {
    const plan = planProduction([line('STEEL', 40)], insumos, Infinity);

    expect(plan.consumed.get('STEEL')).toBe(400);
    expect(plan.processed).toBe(400);
  });

  it('alocação zero não consome nada', () => {
    const plan = planProduction([line('STEEL', 0)], insumos, Infinity);

    expect(plan.consumed.size).toBe(0);
    expect(plan.demanded).toBe(0);
  });

  it('uma linha sem o insumo no país não consome nada', () => {
    const plan = planProduction([line('FUEL', 100)], available({ IRON: 1_000 }), Infinity);

    expect(plan.consumed.size).toBe(0);
  });

  /**
   * O teto é o que impede a decisão de ser "coloque tudo em 100". Quando ele
   * aperta, todas as linhas encolhem juntas: priorizar alguma exigiria inventar
   * uma prioridade que o jogador não escolheu.
   */
  it('encolhe todas as linhas na mesma proporção quando falta capacidade', () => {
    const lines = [line('STEEL', 100), line('FUEL', 50)];

    const semTeto = planProduction(lines, insumos, Infinity);
    const comTeto = planProduction(lines, insumos, 750);

    expect(semTeto.demanded).toBe(1_500);
    expect(comTeto.demanded).toBe(1_500);
    expect(comTeto.processed).toBeCloseTo(750);

    // Metade da demanda de cada uma, mantida a proporção entre elas.
    expect(comTeto.consumed.get('STEEL')).toBeCloseTo(500);
    expect(comTeto.consumed.get('FUEL')).toBeCloseTo(250);
  });

  it('não infla a produção quando sobra capacidade', () => {
    const plan = planProduction([line('STEEL', 50)], insumos, 10_000);

    expect(plan.processed).toBe(500);
  });
});

describe('applyProductionTick', () => {
  const insumoPorTick = available({ IRON: 200, OIL: 100, TIMBER: 300 });

  it('acumula o total produzido e devolve o resto fracionário', () => {
    const result = applyProductionTick([line('STEEL', 100)], insumoPorTick, CONTEXT);

    const steel = result.lines.find((candidate) => candidate.good === 'STEEL')!;

    // 200 de ferro a 2 por unidade = 100 de aço, dentro da capacidade horária.
    expect(steel.producedTotal).toBe(100n);
    expect(result.produced).toBeCloseTo(100);
    expect(result.valueAddedCents).toBeGreaterThan(0);
    expect(result.emissions).toBeGreaterThan(0);
  });

  /**
   * Sem o resto acumulado, uma linha lenta produziria zero para sempre: a fração
   * de uma hora arredondaria para baixo em toda leitura.
   */
  it('produção menor que uma unidade por tick não se perde', () => {
    let lines = [line('STEEL', 100)];
    const migalha = available({ IRON: 0.5 });

    for (let tick = 0; tick < 10; tick += 1) {
      lines = applyProductionTick(lines, migalha, CONTEXT).lines;
    }

    // 0,25 unidade por tick durante 10 ticks: 2 inteiras e meia de resto.
    expect(lines[0]!.producedTotal).toBe(2n);
    expect(lines[0]!.productionCarryMicro).toBe(500_000);
  });

  it('linha parada não muda de estado nem gera delta', () => {
    const lines = [line('STEEL', 0)];
    const result = applyProductionTick(lines, insumoPorTick, CONTEXT);

    expect(result.lines).toEqual(lines);
    expect(result.deltas).toEqual([]);
    expect(result.valueAddedCents).toBe(0);
    expect(result.emissions).toBe(0);
  });

  it('respeita a capacidade do país, não a alocação pedida', () => {
    const enxurrada = available({ IRON: 1_000_000, OIL: 1_000_000, TIMBER: 1_000_000 });

    const lines = GOOD_ORDER.map((good) => line(good, 100));
    const result = applyProductionTick(lines, enxurrada, CONTEXT);

    const consumido = result.deltas.reduce((total, delta) => total + delta.consumed, 0);

    expect(consumido).toBeCloseTo(annualProcessingCapacity(CONTEXT) / TICKS_PER_YEAR);
  });
});
