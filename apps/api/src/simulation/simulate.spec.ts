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
  deposits: [
    {
      type: 'IRON',
      reserves: 50_000_000n,
      extractedTotal: 0n,
      extractionCarryMicro: 0,
    },
    {
      // Carvão pesa nas emissões — é o que torna visível o custo ambiental.
      type: 'COAL',
      reserves: 80_000_000n,
      extractedTotal: 0n,
      extractionCarryMicro: 0,
    },
  ],
  extractionRate: 40,
  // Aço sai do ferro que o país tem; as demais linhas existem sem insumo, que é
  // um estado normal — a decisão continua lá esperando o comércio trazer o resto.
  productionLines: [
    { good: 'PLANKS', allocation: 30, producedTotal: 0n, productionCarryMicro: 0 },
    { good: 'STEEL', allocation: 30, producedTotal: 0n, productionCarryMicro: 0 },
    { good: 'FUEL', allocation: 30, producedTotal: 0n, productionCarryMicro: 0 },
  ],
  happiness: 60,
  happinessCarryMicro: 0,
  emissions: 0,
  emissionsCarryMicro: 0,
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

  describe('recursos', () => {
    const semExtracao = { ...BASE_STATE, extractionRate: 0 };

    it('a extração consome reservas e acumula o total extraído', () => {
      const result = simulateNation(BASE_STATE, CONSTANTS, START, hoursAfterStart(TICKS_PER_YEAR));

      const ferro = result.state.deposits.find((deposit) => deposit.type === 'IRON');

      expect(ferro).toBeDefined();
      expect(ferro!.reserves).toBeLessThan(50_000_000n);
      expect(ferro!.extractedTotal).toBeGreaterThan(0n);

      // O que saiu do solo é exatamente o que entrou no total extraído.
      expect(ferro!.reserves + ferro!.extractedTotal).toBe(50_000_000n);
    });

    it('intensidade zero não extrai, não rende e não polui', () => {
      const result = simulateNation(semExtracao, CONSTANTS, START, hoursAfterStart(TICKS_PER_YEAR));

      expect(result.state.deposits).toEqual(BASE_STATE.deposits);
      expect(result.totals.extracted).toBe(0);
      expect(result.totals.resourceRevenueCents).toBe(0);
      expect(result.state.emissions).toBe(0);
    });

    it('quanto maior a intensidade, mais extração, receita e emissões', () => {
      const baixa = simulateNation(
        { ...BASE_STATE, extractionRate: 20 },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );
      const alta = simulateNation(
        { ...BASE_STATE, extractionRate: 100 },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      expect(alta.totals.extracted).toBeGreaterThan(baixa.totals.extracted);
      expect(alta.totals.resourceRevenueCents).toBeGreaterThan(baixa.totals.resourceRevenueCents);
      expect(alta.state.emissions).toBeGreaterThan(baixa.state.emissions);
    });

    /** O custo de extrair rápido: o país fica rico agora e sem reserva depois. */
    it('extrair no máximo esgota a reserva mais rápido que extrair devagar', () => {
      const reservaDe = (state: typeof BASE_STATE, rate: number) =>
        simulateNation({ ...state, extractionRate: rate }, CONSTANTS, START, hoursAfterStart(8760))
          .state.deposits[0]!.reserves;

      expect(reservaDe(BASE_STATE, 100)).toBeLessThan(reservaDe(BASE_STATE, 25));
    });

    it('a reserva nunca fica negativa, mesmo depois de muitos anos no máximo', () => {
      let state = { ...BASE_STATE, extractionRate: 100 };
      let marco = START;

      // O catch-up é limitado a 1 ano por chamada, então repetimos.
      for (let ano = 1; ano <= 10; ano += 1) {
        const result = simulateNation(
          state,
          CONSTANTS,
          marco,
          hoursAfterStart(ano * TICKS_PER_YEAR),
        );

        state = { ...state, ...result.state };
        marco = result.simulatedUntil;
      }

      for (const deposit of state.deposits) {
        expect(deposit.reserves).toBeGreaterThanOrEqual(0n);
      }
    });

    it('a receita da extração entra no tesouro do mesmo tick', () => {
      const comRecursos = simulateNation(BASE_STATE, CONSTANTS, START, hoursAfterStart(720));
      const sem = simulateNation(semExtracao, CONSTANTS, START, hoursAfterStart(720));

      expect(comRecursos.state.economy.treasuryCents).toBeGreaterThan(
        sem.state.economy.treasuryCents,
      );
    });

    it('um país sem depósito algum é um estado válido', () => {
      const result = simulateNation(
        { ...BASE_STATE, deposits: [] },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      expect(result.state.deposits).toEqual([]);
      expect(result.totals.resourceRevenueCents).toBe(0);
      // O resto do país segue simulando normalmente.
      expect(result.state.population.total).toBeGreaterThan(BASE_STATE.population.total);
    });

    it('a produção não mexe em reservas: ela consome o que já foi extraído', () => {
      const semProducao = simulateNation(
        { ...BASE_STATE, productionLines: [] },
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );
      const comProducao = simulateNation(
        BASE_STATE,
        CONSTANTS,
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      expect(comProducao.state.deposits).toEqual(semProducao.state.deposits);
    });

    it('tecnologia e infraestrutura aumentam a extração', () => {
      const atrasado = simulateNation(
        BASE_STATE,
        { technology: 0, infrastructure: 0 },
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );
      const avancado = simulateNation(
        BASE_STATE,
        { technology: 100, infrastructure: 100 },
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      expect(avancado.totals.extracted).toBeGreaterThan(atrasado.totals.extracted);
    });
  });

  describe('produção', () => {
    const semBeneficiamento: SimulationState = {
      ...BASE_STATE,
      productionLines: BASE_STATE.productionLines.map((line) => ({ ...line, allocation: 0 })),
    };

    const anoDe = (state: SimulationState) =>
      simulateNation(state, CONSTANTS, START, hoursAfterStart(TICKS_PER_YEAR));

    /** A razão de ser da fase: beneficiar o insumo rende mais que vendê-lo bruto. */
    it('beneficiar rende mais ao tesouro que vender tudo in natura', () => {
      const beneficiando = anoDe(BASE_STATE);
      const vendendoBruto = anoDe(semBeneficiamento);

      expect(beneficiando.totals.valueAddedCents).toBeGreaterThan(0);
      expect(beneficiando.state.economy.treasuryCents).toBeGreaterThan(
        vendendoBruto.state.economy.treasuryCents,
      );
    });

    it('acumula o total produzido do bem cujo insumo o país tem', () => {
      const aco = anoDe(BASE_STATE).state.productionLines.find((line) => line.good === 'STEEL');

      expect(aco!.producedTotal).toBeGreaterThan(0n);
    });

    /** Uma linha sem depósito é estado normal: a decisão existe, o insumo não. */
    it('não produz bem cujo insumo o país não tem', () => {
      const combustivel = anoDe(BASE_STATE).state.productionLines.find(
        (line) => line.good === 'FUEL',
      );

      expect(combustivel!.producedTotal).toBe(0n);
    });

    it('alocação zero não produz, não agrega e não polui a mais', () => {
      const result = anoDe(semBeneficiamento);

      expect(result.totals.produced).toBe(0);
      expect(result.totals.valueAddedCents).toBe(0);
      expect(result.state.productionLines).toEqual(semBeneficiamento.productionLines);
      expect(result.state.emissions).toBeLessThan(anoDe(BASE_STATE).state.emissions);
    });

    /** O custo ambiental da decisão: processar polui mais que só extrair. */
    it('beneficiar aumenta as emissões', () => {
      expect(anoDe(BASE_STATE).state.emissions).toBeGreaterThan(
        anoDe(semBeneficiamento).state.emissions,
      );
    });

    /**
     * O teto industrial é o que impede "coloque tudo em 100" de ser a resposta
     * óbvia: sem capacidade, alocar mais não produz mais.
     */
    it('a capacidade industrial limita o quanto adianta alocar', () => {
      const tudoNoMaximo: SimulationState = {
        ...BASE_STATE,
        extractionRate: 100,
        productionLines: BASE_STATE.productionLines.map((line) => ({ ...line, allocation: 100 })),
      };

      const paisPobre = anoDe(tudoNoMaximo);

      const paisDesenvolvido = simulateNation(
        tudoNoMaximo,
        { technology: 100, infrastructure: 100 },
        START,
        hoursAfterStart(TICKS_PER_YEAR),
      );

      expect(paisDesenvolvido.totals.produced).toBeGreaterThan(paisPobre.totals.produced);
    });
  });
});
