import {
  countElapsedTicks,
  employedFrom,
  employmentRate,
  MAX_CATCH_UP_TICKS,
  projectPopulation,
  TICK_DURATION_MS,
  type PopulationContext,
  type PopulationSnapshot,
} from './population-growth';

const BASE_SNAPSHOT: PopulationSnapshot = {
  growthCarryMicro: 0,
  total: 1_000_000n,
  birthRatePerThousand: 18,
  deathRatePerThousand: 8,
  health: 50,
};

/** Felicidade 50 é o ponto neutro: nem atrai nem expulsa habitantes. */
const NEUTRAL_CONTEXT: PopulationContext = { happiness: 50 };

const START = new Date('2026-01-01T00:00:00.000Z');

function hoursAfterStart(hours: number): Date {
  return new Date(START.getTime() + hours * TICK_DURATION_MS);
}

describe('countElapsedTicks', () => {
  it('conta apenas ticks inteiros', () => {
    expect(countElapsedTicks(START, START)).toBe(0);
    expect(countElapsedTicks(START, new Date(START.getTime() + 59 * 60 * 1000))).toBe(0);
    expect(countElapsedTicks(START, hoursAfterStart(1))).toBe(1);
    expect(countElapsedTicks(START, new Date(START.getTime() + 90 * 60 * 1000))).toBe(1);
    expect(countElapsedTicks(START, hoursAfterStart(5))).toBe(5);
  });

  it('ignora tempo negativo (relógio para trás)', () => {
    expect(countElapsedTicks(START, hoursAfterStart(-10))).toBe(0);
  });

  it('limita o catch-up de uma ausência muito longa', () => {
    expect(countElapsedTicks(START, hoursAfterStart(MAX_CATCH_UP_TICKS + 5000))).toBe(
      MAX_CATCH_UP_TICKS,
    );
  });
});

describe('projectPopulation', () => {
  it('não muda nada antes de completar um tick', () => {
    const result = projectPopulation(
      BASE_SNAPSHOT,
      NEUTRAL_CONTEXT,
      START,
      new Date(START.getTime() + 59 * 60 * 1000),
    );

    expect(result.total).toBe(BASE_SNAPSHOT.total);
    expect(result.appliedTicks).toBe(0);
    // O marco não avança: o tempo parcial continua valendo depois.
    expect(result.simulatedUntil).toBe(START);
  });

  it('avança o marco em múltiplos exatos do tick, nunca para "agora"', () => {
    // 3h30: apenas 3 ticks valem, e a meia hora sobrante fica para depois.
    const now = new Date(START.getTime() + 3.5 * TICK_DURATION_MS);
    const result = projectPopulation(BASE_SNAPSHOT, NEUTRAL_CONTEXT, START, now);

    expect(result.appliedTicks).toBe(3);
    expect(result.simulatedUntil).toEqual(hoursAfterStart(3));
    expect(result.simulatedUntil.getTime()).toBeLessThan(now.getTime());
  });

  it('cresce quando a natalidade supera a mortalidade', () => {
    const result = projectPopulation(BASE_SNAPSHOT, NEUTRAL_CONTEXT, START, hoursAfterStart(8760));

    expect(result.total).toBeGreaterThan(BASE_SNAPSHOT.total);
    expect(result.births).toBeGreaterThan(result.deaths);
  });

  it('encolhe quando a mortalidade supera a natalidade', () => {
    const dying: PopulationSnapshot = {
      ...BASE_SNAPSHOT,
      birthRatePerThousand: 5,
      deathRatePerThousand: 20,
    };

    const result = projectPopulation(dying, NEUTRAL_CONTEXT, START, hoursAfterStart(8760));

    expect(result.total).toBeLessThan(BASE_SNAPSHOT.total);
  });

  /**
   * A propriedade central contra exploits: como cada tick é aplicado
   * individualmente, a frequência com que o jogador recarrega a página não pode
   * alterar o resultado.
   */
  it('dá o mesmo resultado aplicando 24 ticks de uma vez ou 1 tick 24 vezes', () => {
    const deUmaVez = projectPopulation(BASE_SNAPSHOT, NEUTRAL_CONTEXT, START, hoursAfterStart(24));

    let snapshot = BASE_SNAPSHOT;
    let marco = START;

    for (let hora = 1; hora <= 24; hora += 1) {
      const passo = projectPopulation(snapshot, NEUTRAL_CONTEXT, marco, hoursAfterStart(hora));

      // O resto fracionário precisa atravessar as chamadas — é exatamente o que
      // faz os dois caminhos coincidirem.
      snapshot = {
        ...snapshot,
        total: passo.total,
        growthCarryMicro: passo.growthCarryMicro,
      };
      marco = passo.simulatedUntil;
    }

    expect(snapshot.total).toBe(deUmaVez.total);
    expect(snapshot.growthCarryMicro).toBe(deUmaVez.growthCarryMicro);
    expect(marco).toEqual(deUmaVez.simulatedUntil);
  });

  it('recarregar sem completar um tick não gera população', () => {
    let snapshot = BASE_SNAPSHOT;
    let marco = START;

    // 10 leituras dentro da mesma hora — um jogador insistindo em F5.
    for (let tentativa = 0; tentativa < 10; tentativa += 1) {
      const passo = projectPopulation(
        snapshot,
        NEUTRAL_CONTEXT,
        marco,
        new Date(START.getTime() + 30 * 60 * 1000),
      );

      snapshot = {
        ...snapshot,
        total: passo.total,
        growthCarryMicro: passo.growthCarryMicro,
      };
      marco = passo.simulatedUntil;
    }

    expect(snapshot.total).toBe(BASE_SNAPSHOT.total);
    expect(snapshot.growthCarryMicro).toBe(0);
  });

  it('é determinístico: mesmas entradas, mesma saída', () => {
    const primeira = projectPopulation(BASE_SNAPSHOT, NEUTRAL_CONTEXT, START, hoursAfterStart(100));
    const segunda = projectPopulation(BASE_SNAPSHOT, NEUTRAL_CONTEXT, START, hoursAfterStart(100));

    expect(primeira).toEqual(segunda);
  });

  describe('saúde', () => {
    it('saúde alta gera mais nascimentos e menos mortes que saúde baixa', () => {
      const saudavel = projectPopulation(
        { ...BASE_SNAPSHOT, health: 100 },
        NEUTRAL_CONTEXT,
        START,
        hoursAfterStart(8760),
      );
      const doente = projectPopulation(
        { ...BASE_SNAPSHOT, health: 0 },
        NEUTRAL_CONTEXT,
        START,
        hoursAfterStart(8760),
      );

      expect(saudavel.births).toBeGreaterThan(doente.births);
      expect(saudavel.deaths).toBeLessThan(doente.deaths);
      expect(saudavel.total).toBeGreaterThan(doente.total);
    });
  });

  describe('migração', () => {
    it('felicidade neutra não move ninguém', () => {
      const result = projectPopulation(
        BASE_SNAPSHOT,
        { happiness: 50 },
        START,
        hoursAfterStart(8760),
      );

      expect(result.migration).toBe(0n);
    });

    it('felicidade alta atrai imigrantes', () => {
      const result = projectPopulation(
        BASE_SNAPSHOT,
        { happiness: 100 },
        START,
        hoursAfterStart(8760),
      );

      expect(result.migration).toBeGreaterThan(0n);
    });

    it('país infeliz perde habitantes para a emigração', () => {
      const result = projectPopulation(
        BASE_SNAPSHOT,
        { happiness: 0 },
        START,
        hoursAfterStart(8760),
      );

      expect(result.migration).toBeLessThan(0n);
    });

    it('infelicidade extrema pode reverter o crescimento natural', () => {
      const infeliz = projectPopulation(
        BASE_SNAPSHOT,
        { happiness: 0 },
        START,
        hoursAfterStart(8760),
      );

      expect(infeliz.total).toBeLessThan(BASE_SNAPSHOT.total);
    });
  });

  it('nunca deixa a população negativa', () => {
    const colapso: PopulationSnapshot = {
      total: 10n,
      growthCarryMicro: 0,
      birthRatePerThousand: 0,
      deathRatePerThousand: 999,
      health: 0,
    };

    const result = projectPopulation(colapso, { happiness: 0 }, START, hoursAfterStart(8760));

    expect(result.total).toBeGreaterThanOrEqual(0n);
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
