import { TICKS_PER_YEAR } from '../simulation/tick';
import { RESOURCE_CATALOG, RESOURCE_ORDER } from './resource-catalog';
import {
  annualExtraction,
  annualNetRevenueOf,
  annualRevenueOf,
  applyDepositTick,
  extractionEfficiency,
  type DepositSnapshot,
  type ExtractionContext,
} from './resource-extraction';

const BASE_DEPOSIT: DepositSnapshot = {
  type: 'IRON',
  reserves: 50_000_000n,
  extractedTotal: 0n,
  extractionCarryMicro: 0,
};

const BASE_CONTEXT: ExtractionContext = {
  extractionRate: 40,
  technology: 10,
  infrastructure: 10,
};

function runTicks(deposit: DepositSnapshot, context: ExtractionContext, ticks: number) {
  let current = deposit;
  let extracted = 0;
  let emissions = 0;

  for (let tick = 0; tick < ticks; tick += 1) {
    const result = applyDepositTick(current, context);

    current = result.deposit;
    extracted += result.delta.extracted;
    emissions += result.delta.emissions;
  }

  return { deposit: current, extracted, emissions };
}

describe('catálogo', () => {
  it('descreve todos os recursos do enum', () => {
    for (const type of RESOURCE_ORDER) {
      expect(RESOURCE_CATALOG[type]).toBeDefined();
    }

    expect(RESOURCE_ORDER.length).toBe(Object.keys(RESOURCE_CATALOG).length);
  });

  it('cobra emissões de todo recurso, inclusive os limpos', () => {
    for (const type of RESOURCE_ORDER) {
      expect(RESOURCE_CATALOG[type].emissionsPerMillion).toBeGreaterThan(0);
    }
  });

  it('dá aos fósseis emissões maiores que às renováveis', () => {
    expect(RESOURCE_CATALOG.COAL.emissionsPerMillion).toBeGreaterThan(
      RESOURCE_CATALOG.TIMBER.emissionsPerMillion,
    );
    expect(RESOURCE_CATALOG.OIL.emissionsPerMillion).toBeGreaterThan(
      RESOURCE_CATALOG.WATER.emissionsPerMillion,
    );
  });

  it('torna os raros mais valiosos que os comuns', () => {
    expect(RESOURCE_CATALOG.GOLD.basePriceCents).toBeGreaterThan(
      RESOURCE_CATALOG.WATER.basePriceCents,
    );
    expect(RESOURCE_CATALOG.GOLD.abundance).toBeLessThan(RESOURCE_CATALOG.WATER.abundance);
  });
});

describe('extractionEfficiency', () => {
  it('cresce com tecnologia e infraestrutura', () => {
    expect(extractionEfficiency(0, 0)).toBeLessThan(extractionEfficiency(100, 100));
  });

  it('dá à tecnologia o maior peso', () => {
    expect(extractionEfficiency(100, 0)).toBeGreaterThan(extractionEfficiency(0, 100));
  });
});

describe('annualExtraction', () => {
  it('é proporcional à reserva restante', () => {
    const dobro = annualExtraction(BASE_DEPOSIT.reserves * 2n, BASE_CONTEXT);

    expect(dobro).toBeCloseTo(annualExtraction(BASE_DEPOSIT.reserves, BASE_CONTEXT) * 2, 6);
  });

  it('é zero com intensidade zero', () => {
    expect(annualExtraction(BASE_DEPOSIT.reserves, { ...BASE_CONTEXT, extractionRate: 0 })).toBe(0);
  });

  it('é zero quando a reserva acabou', () => {
    expect(annualExtraction(0n, BASE_CONTEXT)).toBe(0);
  });
});

describe('receita', () => {
  it('a líquida é menor que a bruta — extrair tem custo', () => {
    expect(annualNetRevenueOf(BASE_DEPOSIT, BASE_CONTEXT)).toBeLessThan(
      annualRevenueOf(BASE_DEPOSIT, BASE_CONTEXT),
    );
  });

  it('a líquida ainda é positiva: extrair vale a pena', () => {
    expect(annualNetRevenueOf(BASE_DEPOSIT, BASE_CONTEXT)).toBeGreaterThan(0);
  });

  it('recursos caros rendem mais que baratos na mesma quantidade', () => {
    const ouro = annualRevenueOf({ ...BASE_DEPOSIT, type: 'GOLD' }, BASE_CONTEXT);
    const agua = annualRevenueOf({ ...BASE_DEPOSIT, type: 'WATER' }, BASE_CONTEXT);

    expect(ouro).toBeGreaterThan(agua);
  });
});

describe('applyDepositTick', () => {
  it('é determinístico: mesmas entradas, mesma saída', () => {
    expect(applyDepositTick(BASE_DEPOSIT, BASE_CONTEXT)).toEqual(
      applyDepositTick(BASE_DEPOSIT, BASE_CONTEXT),
    );
  });

  it('não muta o depósito recebido', () => {
    applyDepositTick(BASE_DEPOSIT, BASE_CONTEXT);

    expect(BASE_DEPOSIT.reserves).toBe(50_000_000n);
    expect(BASE_DEPOSIT.extractedTotal).toBe(0n);
  });

  /**
   * A conservação que garante que nada é criado nem perdido: o que saiu da
   * reserva é exatamente o que entrou no total extraído, tick após tick.
   */
  it('conserva a soma de reserva e total extraído', () => {
    const result = runTicks(BASE_DEPOSIT, BASE_CONTEXT, TICKS_PER_YEAR);

    expect(result.deposit.reserves + result.deposit.extractedTotal).toBe(BASE_DEPOSIT.reserves);
  });

  it('mantém o resto sempre em [0, 1_000_000)', () => {
    let current = BASE_DEPOSIT;

    for (let tick = 0; tick < 200; tick += 1) {
      current = applyDepositTick(current, BASE_CONTEXT).deposit;

      expect(current.extractionCarryMicro).toBeGreaterThanOrEqual(0);
      expect(current.extractionCarryMicro).toBeLessThan(1_000_000);
    }
  });

  /**
   * Num depósito pequeno com intensidade baixa, um tick extrai muito menos de
   * uma unidade — sem o resto acumulado, a extração seria eternamente zero.
   */
  it('acumula no resto a extração menor que uma unidade', () => {
    const pequeno: DepositSnapshot = { ...BASE_DEPOSIT, reserves: 1_000n };
    const devagar: ExtractionContext = { ...BASE_CONTEXT, extractionRate: 1 };

    const umTick = applyDepositTick(pequeno, devagar);

    expect(umTick.deposit.reserves).toBe(pequeno.reserves);
    expect(umTick.deposit.extractionCarryMicro).toBeGreaterThan(0);

    // Neste ritmo sai cerca de 0,2 unidade por ANO: um ano inteiro ainda não
    // completa uma unidade, e o resto precisa atravessar milhares de ticks.
    const umAno = runTicks(pequeno, devagar, TICKS_PER_YEAR);

    expect(umAno.deposit.reserves).toBe(pequeno.reserves);
    expect(umAno.deposit.extractionCarryMicro).toBeGreaterThan(umTick.deposit.extractionCarryMicro);

    // Depois de tempo suficiente, a fração acumulada vira unidade inteira.
    expect(runTicks(pequeno, devagar, TICKS_PER_YEAR * 10).deposit.reserves).toBeLessThan(
      pequeno.reserves,
    );
  });

  it('nunca deixa a reserva negativa', () => {
    const quaseVazio: DepositSnapshot = { ...BASE_DEPOSIT, reserves: 3n };

    const result = runTicks(quaseVazio, { ...BASE_CONTEXT, extractionRate: 100 }, TICKS_PER_YEAR);

    expect(result.deposit.reserves).toBeGreaterThanOrEqual(0n);
  });

  /** O esgotamento é assintótico: desacelera em vez de secar de repente. */
  it('extrai menos por tick à medida que a reserva diminui', () => {
    const cheio = applyDepositTick(BASE_DEPOSIT, BASE_CONTEXT);
    const vazio = applyDepositTick(
      { ...BASE_DEPOSIT, reserves: BASE_DEPOSIT.reserves / 10n },
      BASE_CONTEXT,
    );

    expect(vazio.delta.extracted).toBeLessThan(cheio.delta.extracted);
  });

  it('um ano de ticks extrai o que a projeção anual prometeu', () => {
    // A projeção usa a reserva inicial; como ela cai ao longo do ano, o total
    // real fica um pouco abaixo — mas na mesma ordem de grandeza.
    const projetado = annualExtraction(BASE_DEPOSIT.reserves, BASE_CONTEXT);
    const real = runTicks(BASE_DEPOSIT, BASE_CONTEXT, TICKS_PER_YEAR).extracted;

    expect(real).toBeLessThanOrEqual(projetado);
    expect(real).toBeGreaterThan(projetado * 0.98);
  });

  it('emite proporcionalmente ao que foi extraído', () => {
    const carvao = runTicks({ ...BASE_DEPOSIT, type: 'COAL' }, BASE_CONTEXT, TICKS_PER_YEAR);
    const agua = runTicks({ ...BASE_DEPOSIT, type: 'WATER' }, BASE_CONTEXT, TICKS_PER_YEAR);

    // Mesma quantidade extraída, emissões muito diferentes.
    expect(carvao.extracted).toBeCloseTo(agua.extracted, 6);
    expect(carvao.emissions).toBeGreaterThan(agua.emissions);
  });
});
