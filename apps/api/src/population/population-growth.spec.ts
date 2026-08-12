import { TICKS_PER_YEAR } from '../simulation/tick';
import {
  applyPopulationTick,
  employedFrom,
  employmentRate,
  type PopulationContext,
  type PopulationSnapshot,
} from './population-growth';

const BASE_SNAPSHOT: PopulationSnapshot = {
  growthCarryMicro: 0,
  total: 1_000_000n,
  birthRatePerThousand: 18,
  deathRatePerThousand: 8,
  health: 50,
  education: 10,
};

/** Felicidade 50 é o ponto neutro: nem atrai nem expulsa habitantes. */
const NEUTRAL_CONTEXT: PopulationContext = { happiness: 50 };

/**
 * Aplica N ticks seguidos. As propriedades do laço completo (anti-exploit,
 * marco temporal) são testadas no orquestrador — aqui o laço é só uma
 * conveniência para observar efeitos que levam um ano para aparecer.
 */
function runTicks(
  snapshot: PopulationSnapshot,
  context: PopulationContext,
  ticks: number,
): { snapshot: PopulationSnapshot; births: number; deaths: number; migration: number } {
  let current = snapshot;
  let births = 0;
  let deaths = 0;
  let migration = 0;

  for (let tick = 0; tick < ticks; tick += 1) {
    const result = applyPopulationTick(current, context);

    current = result.snapshot;
    births += result.delta.births;
    deaths += result.delta.deaths;
    migration += result.delta.migration;
  }

  return { snapshot: current, births, deaths, migration };
}

describe('applyPopulationTick', () => {
  it('é determinístico: mesmas entradas, mesma saída', () => {
    expect(applyPopulationTick(BASE_SNAPSHOT, NEUTRAL_CONTEXT)).toEqual(
      applyPopulationTick(BASE_SNAPSHOT, NEUTRAL_CONTEXT),
    );
  });

  it('não muta o snapshot recebido', () => {
    applyPopulationTick(BASE_SNAPSHOT, NEUTRAL_CONTEXT);

    expect(BASE_SNAPSHOT.total).toBe(1_000_000n);
    expect(BASE_SNAPSHOT.growthCarryMicro).toBe(0);
  });

  /**
   * Num país pequeno, um tick move muito menos de uma pessoa: o crescimento
   * inteiro vive no resto acumulado. É exatamente por isso que o resto precisa
   * ser persistido — sem ele, esta fração seria descartada a cada leitura e um
   * país assim nunca cresceria.
   */
  it('acumula no resto o crescimento menor que um habitante', () => {
    const vilarejo: PopulationSnapshot = { ...BASE_SNAPSHOT, total: 1_000n };

    const result = applyPopulationTick(vilarejo, NEUTRAL_CONTEXT);

    expect(result.snapshot.total).toBe(vilarejo.total);
    expect(result.snapshot.growthCarryMicro).toBeGreaterThan(0);
  });

  it('o resto acumulado vira habitante inteiro depois de ticks suficientes', () => {
    const vilarejo: PopulationSnapshot = { ...BASE_SNAPSHOT, total: 1_000n };

    expect(runTicks(vilarejo, NEUTRAL_CONTEXT, TICKS_PER_YEAR).snapshot.total).toBeGreaterThan(
      vilarejo.total,
    );
  });

  it('mantém o resto sempre em [0, 1_000_000)', () => {
    const shrinking = { ...BASE_SNAPSHOT, birthRatePerThousand: 2, deathRatePerThousand: 30 };

    let current = shrinking;

    for (let tick = 0; tick < 100; tick += 1) {
      current = applyPopulationTick(current, NEUTRAL_CONTEXT).snapshot;

      expect(current.growthCarryMicro).toBeGreaterThanOrEqual(0);
      expect(current.growthCarryMicro).toBeLessThan(1_000_000);
    }
  });

  it('cresce quando a natalidade supera a mortalidade', () => {
    const result = runTicks(BASE_SNAPSHOT, NEUTRAL_CONTEXT, TICKS_PER_YEAR);

    expect(result.snapshot.total).toBeGreaterThan(BASE_SNAPSHOT.total);
    expect(result.births).toBeGreaterThan(result.deaths);
  });

  it('encolhe quando a mortalidade supera a natalidade', () => {
    const dying: PopulationSnapshot = {
      ...BASE_SNAPSHOT,
      birthRatePerThousand: 5,
      deathRatePerThousand: 20,
    };

    const result = runTicks(dying, NEUTRAL_CONTEXT, TICKS_PER_YEAR);

    expect(result.snapshot.total).toBeLessThan(BASE_SNAPSHOT.total);
  });

  describe('saúde', () => {
    it('saúde alta gera mais nascimentos e menos mortes que saúde baixa', () => {
      const saudavel = runTicks({ ...BASE_SNAPSHOT, health: 100 }, NEUTRAL_CONTEXT, TICKS_PER_YEAR);
      const doente = runTicks({ ...BASE_SNAPSHOT, health: 0 }, NEUTRAL_CONTEXT, TICKS_PER_YEAR);

      expect(saudavel.births).toBeGreaterThan(doente.births);
      expect(saudavel.deaths).toBeLessThan(doente.deaths);
      expect(saudavel.snapshot.total).toBeGreaterThan(doente.snapshot.total);
    });
  });

  describe('migração', () => {
    it('felicidade neutra não move ninguém', () => {
      expect(runTicks(BASE_SNAPSHOT, { happiness: 50 }, TICKS_PER_YEAR).migration).toBe(0);
    });

    it('felicidade alta atrai imigrantes', () => {
      expect(runTicks(BASE_SNAPSHOT, { happiness: 100 }, TICKS_PER_YEAR).migration).toBeGreaterThan(
        0,
      );
    });

    it('país infeliz perde habitantes para a emigração', () => {
      expect(runTicks(BASE_SNAPSHOT, { happiness: 0 }, TICKS_PER_YEAR).migration).toBeLessThan(0);
    });

    it('infelicidade extrema pode reverter o crescimento natural', () => {
      const infeliz = runTicks(BASE_SNAPSHOT, { happiness: 0 }, TICKS_PER_YEAR);

      expect(infeliz.snapshot.total).toBeLessThan(BASE_SNAPSHOT.total);
    });
  });

  it('nunca deixa a população negativa', () => {
    const colapso: PopulationSnapshot = {
      total: 10n,
      growthCarryMicro: 0,
      birthRatePerThousand: 0,
      deathRatePerThousand: 999,
      health: 0,
      education: 0,
    };

    const result = runTicks(colapso, { happiness: 0 }, TICKS_PER_YEAR);

    expect(result.snapshot.total).toBeGreaterThanOrEqual(0n);
  });
});

describe('employmentRate', () => {
  it('cresce com a educação', () => {
    expect(employmentRate(0)).toBeLessThan(employmentRate(100));
  });

  it('fica em uma faixa plausível', () => {
    expect(employmentRate(0)).toBeGreaterThan(0.5);
    expect(employmentRate(100)).toBeLessThan(0.9);
  });

  it('employedFrom nunca excede a população total', () => {
    const total = 1_000_000n;

    expect(employedFrom(total, 100)).toBeLessThan(total);
  });
});
