import { TICKS_PER_YEAR } from '../simulation/tick';
import {
  annualConsumption,
  annualFarmlandCostCents,
  annualFarmlandYield,
  applyAgricultureTick,
  farmlandArea,
  type AgricultureContext,
  type AgricultureSnapshot,
} from './agriculture-calculations';
import { AGRICULTURE_DEFAULTS } from './agriculture-defaults';

const CONTEXT: AgricultureContext = {
  population: 1_000_000n,
  territory: 100_000,
  technology: 10,
  tickIndex: 0,
};

const STATE: AgricultureSnapshot = {
  farmlandShare: AGRICULTURE_DEFAULTS.farmlandShare,
  foodStock: AGRICULTURE_DEFAULTS.foodStock,
  foodCarryMicro: 0,
  weatherSeed: 4_242,
};

/** Roda um ano inteiro tick a tick, como o laço de simulação faria. */
function simulateYear(
  state: AgricultureSnapshot,
  context: AgricultureContext = CONTEXT,
  ticks = TICKS_PER_YEAR,
) {
  let current = state;
  let produced = 0;
  let hungryTicks = 0;

  for (let tick = 0; tick < ticks; tick += 1) {
    const result = applyAgricultureTick(current, { ...context, tickIndex: tick });

    current = result.snapshot;
    produced += result.delta.produced;
    hungryTicks += result.delta.shortage > 0 ? 1 : 0;
  }

  return { state: current, produced, hungryTicks };
}

describe('calibração do país inicial', () => {
  /**
   * O número que dá sentido ao default: um país recém-fundado precisa se
   * alimentar com folga pequena. Folga grande tornaria a decisão ignorável;
   * déficit de saída seria uma armadilha para quem nem viu o painel ainda.
   */
  it('a lavoura inicial produz um pouco mais do que o país come', () => {
    const producao = annualFarmlandYield(AGRICULTURE_DEFAULTS.farmlandShare, CONTEXT);
    const consumo = annualConsumption(CONTEXT.population);

    expect(producao).toBeGreaterThan(consumo);
    expect(producao).toBeLessThan(consumo * 1.3);
  });

  it('o estoque inicial cobre cerca de meio ano de consumo', () => {
    const meses = (Number(AGRICULTURE_DEFAULTS.foodStock) / annualConsumption(1_000_000n)) * 12;

    expect(meses).toBeGreaterThanOrEqual(5);
    expect(meses).toBeLessThanOrEqual(7);
  });
});

describe('farmlandArea', () => {
  it('é a fração do território', () => {
    expect(farmlandArea(35, 100_000)).toBe(35_000);
    expect(farmlandArea(0, 100_000)).toBe(0);
    expect(farmlandArea(100, 100_000)).toBe(100_000);
  });
});

describe('annualFarmlandYield', () => {
  it('cresce com a tecnologia', () => {
    const atrasado = annualFarmlandYield(35, { ...CONTEXT, technology: 0 });
    const avancado = annualFarmlandYield(35, { ...CONTEXT, technology: 100 });

    expect(avancado).toBeGreaterThan(atrasado);
  });

  it('sem lavoura não há colheita', () => {
    expect(annualFarmlandYield(0, CONTEXT)).toBe(0);
  });
});

describe('applyAgricultureTick', () => {
  it('acumula estoque quando a colheita passa do consumo', () => {
    const { state } = simulateYear(STATE);

    expect(state.foodStock).toBeGreaterThan(STATE.foodStock);
  });

  /** O estoque existe para isto: atravessar o período ruim sem fome. */
  it('come do estoque quando a colheita não basta, sem passar fome', () => {
    const { state, hungryTicks } = simulateYear({ ...STATE, farmlandShare: 25 });

    expect(state.foodStock).toBeLessThan(STATE.foodStock);
    expect(hungryTicks).toBe(0);
  });

  it('nunca deixa o estoque negativo, nem sem lavoura alguma', () => {
    const { state } = simulateYear({ ...STATE, farmlandShare: 0 });

    expect(state.foodStock).toBeGreaterThanOrEqual(0n);
    expect(state.foodStock).toBe(0n);
  });

  /** A consequência da fase: sem comida, a felicidade despenca. */
  it('cobra felicidade quando falta comida', () => {
    const semLavoura = applyAgricultureTick({ ...STATE, farmlandShare: 0, foodStock: 0n }, CONTEXT);

    expect(semLavoura.delta.shortage).toBeCloseTo(1);
    expect(semLavoura.delta.happinessDelta).toBeLessThan(0);
  });

  it('não cobra nada de um país que come o que precisa', () => {
    expect(applyAgricultureTick(STATE, CONTEXT).delta.happinessDelta).toBe(0);
  });

  it('atende parcialmente quando há alguma comida, não tudo ou nada', () => {
    const { delta } = applyAgricultureTick({ ...STATE, farmlandShare: 0, foodStock: 20n }, CONTEXT);

    expect(delta.consumed).toBeGreaterThan(0);
    expect(delta.shortage).toBeGreaterThan(0);
    expect(delta.shortage).toBeLessThan(1);
  });

  /**
   * Sem o resto acumulado, o excedente de uma hora arredondaria para zero e o
   * estoque nunca subiria — o mesmo motivo de todos os outros `carry`.
   */
  it('acumula excedentes menores que uma tonelada por tick', () => {
    // Um vilarejo: meia tonelada de consumo ao ano contra uma lavoura minúscula.
    // O excedente de um tick é da ordem de um grama.
    const migalha: AgricultureContext = { ...CONTEXT, population: 1n, territory: 10 };

    let state: AgricultureSnapshot = { ...STATE, farmlandShare: 5, foodStock: 0n };

    for (let tick = 0; tick < 8_760; tick += 1) {
      state = applyAgricultureTick(state, { ...migalha, tickIndex: tick }).snapshot;
    }

    expect(state.foodStock).toBeGreaterThan(0n);
  });

  it('mais lavoura custa mais e emite mais', () => {
    const pouca = applyAgricultureTick({ ...STATE, farmlandShare: 10 }, CONTEXT).delta;
    const muita = applyAgricultureTick({ ...STATE, farmlandShare: 80 }, CONTEXT).delta;

    expect(muita.costCents).toBeGreaterThan(pouca.costCents);
    expect(muita.emissions).toBeGreaterThan(pouca.emissions);
  });

  it('sem lavoura não há custo nem emissão', () => {
    const { delta } = applyAgricultureTick({ ...STATE, farmlandShare: 0 }, CONTEXT);

    expect(delta.costCents).toBe(0);
    expect(delta.emissions).toBe(0);
    expect(annualFarmlandCostCents(0, CONTEXT.territory)).toBe(0);
  });

  /** O clima precisa chegar à colheita, senão seria enfeite de tela. */
  it('a safra varia com o clima do tick', () => {
    const colheitas = Array.from(
      { length: 12 },
      (_, mes) => applyAgricultureTick(STATE, { ...CONTEXT, tickIndex: mes * 30 * 24 }).delta,
    );

    const produzido = colheitas.map((delta) => delta.produced);

    expect(new Set(produzido).size).toBeGreaterThan(6);
    expect(Math.max(...produzido)).toBeGreaterThan(Math.min(...produzido) * 1.2);
  });
});
