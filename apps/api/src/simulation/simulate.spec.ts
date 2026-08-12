import { NEUTRAL_TAX_RATE } from '../economy/economy-calculations';
import { simulateNation, type SimulationConstants, type SimulationState } from './simulate';
import { MAX_CATCH_UP_TICKS, TICK_DURATION_MS, TICKS_PER_YEAR } from './tick';

const BASE_STATE: SimulationState = {
  population: {
    total: 1_000_000n,
    growthCarryMicro: 0,
    birthRatePerThousand: 18,
    deathRatePerThousand: 8,
    health: 50,
    education: 10,
  },
  economy: {
    treasuryCents: 500_000_000n,
    treasuryCarryMicro: 0,
    taxRate: NEUTRAL_TAX_RATE,
  },
  happiness: 60,
  happinessCarryMicro: 0,
};

const CONSTANTS: SimulationConstants = { technology: 10, infrastructure: 10 };

const START = new Date('2026-01-01T00:00:00.000Z');

function hoursAfterStart(hours: number): Date {
  return new Date(START.getTime() + hours * TICK_DURATION_MS);
}

/**
 * Simula em fatias, como faria um jogador abrindo o jogo várias vezes.
 *
 * Cada fatia parte do estado que a anterior deixou — inclusive os restos
 * acumulados, que é justamente o que precisa atravessar as chamadas.
 */
function simulateInSlices(totalHours: number, sliceHours: number): SimulationState {
  let state = BASE_STATE;
  let marco = START;

  for (let hora = sliceHours; hora <= totalHours; hora += sliceHours) {
    const result = simulateNation(state, CONSTANTS, marco, hoursAfterStart(hora));

    state = result.state;
    marco = result.simulatedUntil;
  }

  return state;
}

describe('countElapsedTicks (via simulateNation)', () => {
  it('não muda nada antes de completar um tick', () => {
    const result = simulateNation(
      BASE_STATE,
      CONSTANTS,
      START,
      new Date(START.getTime() + 59 * 60 * 1000),
    );

    expect(result.appliedTicks).toBe(0);
    expect(result.state).toBe(BASE_STATE);
    // O marco não avança: o tempo parcial continua valendo depois.
    expect(result.simulatedUntil).toBe(START);
  });

  it('ignora tempo negativo (relógio para trás)', () => {
    expect(simulateNation(BASE_STATE, CONSTANTS, START, hoursAfterStart(-10)).appliedTicks).toBe(0);
  });

  it('avança o marco em múltiplos exatos do tick, nunca para "agora"', () => {
    // 3h30: apenas 3 ticks valem, e a meia hora sobrante fica para depois.
    const now = new Date(START.getTime() + 3.5 * TICK_DURATION_MS);
    const result = simulateNation(BASE_STATE, CONSTANTS, START, now);

    expect(result.appliedTicks).toBe(3);
    expect(result.simulatedUntil).toEqual(hoursAfterStart(3));
    expect(result.simulatedUntil.getTime()).toBeLessThan(now.getTime());
  });

  it('limita o catch-up de uma ausência muito longa', () => {
    const result = simulateNation(
      BASE_STATE,
      CONSTANTS,
      START,
      hoursAfterStart(MAX_CATCH_UP_TICKS + 5000),
    );

    expect(result.appliedTicks).toBe(MAX_CATCH_UP_TICKS);
  });
});

describe('simulateNation', () => {
  it('é determinístico: mesmas entradas, mesma saída', () => {
    expect(simulateNation(BASE_STATE, CONSTANTS, START, hoursAfterStart(100))).toEqual(
      simulateNation(BASE_STATE, CONSTANTS, START, hoursAfterStart(100)),
    );
  });

  it('faz a população e o tesouro crescerem juntos ao longo de um ano', () => {
    const result = simulateNation(BASE_STATE, CONSTANTS, START, hoursAfterStart(TICKS_PER_YEAR));

    expect(result.state.population.total).toBeGreaterThan(BASE_STATE.population.total);
    expect(result.totals.births).toBeGreaterThan(0);
    expect(result.totals.revenueCents).toBeGreaterThan(0);
  });

  /**
   * A propriedade central contra exploits, e a razão de este módulo existir.
   *
   * Com laços separados por domínio, a economia de um jogador ausente seria
   * calculada sobre a população FINAL, enquanto a de quem recarrega usaria a
   * população de cada hora. Esperar renderia mais dinheiro que jogar.
   *
   * Como os dois domínios avançam no mesmo laço, tick a tick, a frequência com
   * que o jogador abre o jogo não pode alterar o resultado.
   */
  it('dá o mesmo resultado em uma fatia só ou em várias', () => {
    const deUmaVez = simulateNation(BASE_STATE, CONSTANTS, START, hoursAfterStart(720)).state;

    const deHoraEmHora = simulateInSlices(720, 1);
    const deSeisEmSeis = simulateInSlices(720, 6);

    expect(deHoraEmHora).toEqual(deUmaVez);
    expect(deSeisEmSeis).toEqual(deUmaVez);
  });

  it('recarregar sem completar um tick não gera população nem dinheiro', () => {
    let state = BASE_STATE;
    let marco = START;

    // 10 leituras dentro da mesma hora — um jogador insistindo em F5.
    for (let tentativa = 0; tentativa < 10; tentativa += 1) {
      const result = simulateNation(
        state,
        CONSTANTS,
        marco,
        new Date(START.getTime() + 30 * 60 * 1000),
      );

      state = result.state;
      marco = result.simulatedUntil;
    }

    expect(state).toEqual(BASE_STATE);
  });

  describe('a economia realimenta a demografia', () => {
    /**
     * O acoplamento que justifica o laço conjunto: o imposto move a felicidade,
     * a felicidade move a migração, e a migração muda quem trabalha e paga
     * imposto no tick seguinte.
     */
    it('imposto alto derruba a felicidade e, com ela, a população', () => {
      const confisco = simulateNation(
        { ...BASE_STATE, economy: { ...BASE_STATE.economy, taxRate: 100 } },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      const neutro = simulateNation(BASE_STATE, CONSTANTS, START, hoursAfterStart(TICKS_PER_YEAR));

      expect(confisco.state.happiness).toBeLessThan(BASE_STATE.happiness);
      expect(confisco.totals.migration).toBeLessThan(neutro.totals.migration);
      expect(confisco.state.population.total).toBeLessThan(neutro.state.population.total);
    });

    it('imposto baixo levanta a felicidade', () => {
      const alivio = simulateNation(
        { ...BASE_STATE, economy: { ...BASE_STATE.economy, taxRate: 0 } },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      expect(alivio.state.happiness).toBeGreaterThan(BASE_STATE.happiness);
    });

    /** Sem o resto acumulado, a variação por tick arredondaria a zero para sempre. */
    it('a felicidade se move mesmo com variação por tick menor que 1 ponto', () => {
      const umMes = simulateNation(
        { ...BASE_STATE, economy: { ...BASE_STATE.economy, taxRate: 100 } },
        CONSTANTS,
        START,
        hoursAfterStart(720),
      );

      expect(umMes.state.happiness).toBeLessThan(BASE_STATE.happiness);
    });
  });

  describe('limites da felicidade', () => {
    it('não passa de 100 nem cai abaixo de 0', () => {
      const eufórico = simulateNation(
        { ...BASE_STATE, happiness: 99, economy: { ...BASE_STATE.economy, taxRate: 0 } },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR * 2),
      );

      const miserável = simulateNation(
        { ...BASE_STATE, happiness: 1, economy: { ...BASE_STATE.economy, taxRate: 100 } },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      expect(eufórico.state.happiness).toBeLessThanOrEqual(100);
      expect(miserável.state.happiness).toBeGreaterThanOrEqual(0);
    });

    /**
     * No limite o resto é descartado: sem isso, um país cronicamente infeliz
     * acumularia uma dívida invisível e demoraria a reagir depois que o jogador
     * corrigisse a alíquota.
     */
    it('não acumula resto depois de bater no piso', () => {
      const result = simulateNation(
        { ...BASE_STATE, happiness: 0, economy: { ...BASE_STATE.economy, taxRate: 100 } },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      expect(result.state.happiness).toBe(0);
      expect(result.state.happinessCarryMicro).toBe(0);
    });
  });
});
