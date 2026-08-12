import { TICKS_PER_YEAR } from '../simulation/tick';
import {
  annualExpensesCents,
  annualHappinessFromTax,
  annualRevenueCents,
  applyEconomyTick,
  gdpCents,
  NEUTRAL_TAX_RATE,
  outputPerWorkerCents,
  type EconomyContext,
  type EconomySnapshot,
} from './economy-calculations';

const BASE_CONTEXT: EconomyContext = {
  employed: 580_000n,
  population: 1_000_000n,
  technology: 10,
  infrastructure: 10,
  education: 10,
};

const BASE_SNAPSHOT: EconomySnapshot = {
  treasuryCents: 500_000_000n,
  treasuryCarryMicro: 0,
  taxRate: NEUTRAL_TAX_RATE,
};

function runTicks(snapshot: EconomySnapshot, context: EconomyContext, ticks: number) {
  let current = snapshot;
  let revenueCents = 0;
  let expensesCents = 0;

  for (let tick = 0; tick < ticks; tick += 1) {
    const result = applyEconomyTick(current, context);

    current = result.snapshot;
    revenueCents += result.delta.revenueCents;
    expensesCents += result.delta.expensesCents;
  }

  return { snapshot: current, revenueCents, expensesCents };
}

describe('outputPerWorkerCents', () => {
  it('cresce com tecnologia, infraestrutura e educação', () => {
    const base = outputPerWorkerCents(0, 0, 0);

    expect(outputPerWorkerCents(100, 0, 0)).toBeGreaterThan(base);
    expect(outputPerWorkerCents(0, 100, 0)).toBeGreaterThan(base);
    expect(outputPerWorkerCents(0, 0, 100)).toBeGreaterThan(base);
  });

  it('dá à tecnologia o maior peso dos três', () => {
    expect(outputPerWorkerCents(100, 0, 0)).toBeGreaterThan(outputPerWorkerCents(0, 100, 0));
    expect(outputPerWorkerCents(0, 100, 0)).toBeGreaterThan(outputPerWorkerCents(0, 0, 100));
  });
});

describe('gdpCents', () => {
  it('é proporcional à força de trabalho', () => {
    const dobro = gdpCents({ ...BASE_CONTEXT, employed: BASE_CONTEXT.employed * 2n });

    expect(dobro).toBe(gdpCents(BASE_CONTEXT) * 2n);
  });

  it('um país sem trabalhadores não produz nada', () => {
    expect(gdpCents({ ...BASE_CONTEXT, employed: 0n })).toBe(0n);
  });
});

describe('annualHappinessFromTax', () => {
  it('a alíquota neutra não move a felicidade', () => {
    expect(annualHappinessFromTax(NEUTRAL_TAX_RATE)).toBe(0);
  });

  it('imposto baixo agrada, imposto alto incomoda', () => {
    expect(annualHappinessFromTax(0)).toBeGreaterThan(0);
    expect(annualHappinessFromTax(100)).toBeLessThan(0);
  });

  it('quanto maior a alíquota, pior a felicidade', () => {
    expect(annualHappinessFromTax(80)).toBeLessThan(annualHappinessFromTax(50));
    expect(annualHappinessFromTax(50)).toBeLessThan(annualHappinessFromTax(30));
  });

  /** Confiscar toda a renda deve doer mais do que não cobrar nada agrada. */
  it('pune o extremo mais do que premia o zero', () => {
    expect(Math.abs(annualHappinessFromTax(100))).toBeGreaterThan(annualHappinessFromTax(0));
  });
});

describe('applyEconomyTick', () => {
  it('é determinístico: mesmas entradas, mesma saída', () => {
    expect(applyEconomyTick(BASE_SNAPSHOT, BASE_CONTEXT)).toEqual(
      applyEconomyTick(BASE_SNAPSHOT, BASE_CONTEXT),
    );
  });

  it('não muta o snapshot recebido', () => {
    applyEconomyTick(BASE_SNAPSHOT, BASE_CONTEXT);

    expect(BASE_SNAPSHOT.treasuryCents).toBe(500_000_000n);
    expect(BASE_SNAPSHOT.treasuryCarryMicro).toBe(0);
  });

  it('imposto zero não arrecada nada', () => {
    const result = applyEconomyTick({ ...BASE_SNAPSHOT, taxRate: 0 }, BASE_CONTEXT);

    expect(result.delta.revenueCents).toBe(0);
    expect(result.delta.balanceCents).toBeLessThan(0);
  });

  it('quanto maior a alíquota, maior a receita', () => {
    const baixa = applyEconomyTick({ ...BASE_SNAPSHOT, taxRate: 10 }, BASE_CONTEXT);
    const alta = applyEconomyTick({ ...BASE_SNAPSHOT, taxRate: 60 }, BASE_CONTEXT);

    expect(alta.delta.revenueCents).toBeGreaterThan(baixa.delta.revenueCents);
  });

  /** O exemplo do CLAUDE.md seção 13: mais imposto, mais receita, menos felicidade. */
  it('a alíquota que mais arrecada é também a que mais custa em felicidade', () => {
    const alta = applyEconomyTick({ ...BASE_SNAPSHOT, taxRate: 90 }, BASE_CONTEXT);
    const baixa = applyEconomyTick({ ...BASE_SNAPSHOT, taxRate: 10 }, BASE_CONTEXT);

    expect(alta.delta.revenueCents).toBeGreaterThan(baixa.delta.revenueCents);
    expect(alta.delta.happinessDelta).toBeLessThan(baixa.delta.happinessDelta);
  });

  it('o tesouro fica negativo quando o país gasta mais do que arrecada', () => {
    const pobre: EconomySnapshot = { ...BASE_SNAPSHOT, treasuryCents: 0n, taxRate: 0 };

    const result = runTicks(pobre, BASE_CONTEXT, TICKS_PER_YEAR);

    expect(result.snapshot.treasuryCents).toBeLessThan(0n);
  });

  it('mantém o resto sempre em [0, 1_000_000), inclusive no vermelho', () => {
    let current: EconomySnapshot = { ...BASE_SNAPSHOT, taxRate: 0 };

    for (let tick = 0; tick < 100; tick += 1) {
      current = applyEconomyTick(current, BASE_CONTEXT).snapshot;

      expect(current.treasuryCarryMicro).toBeGreaterThanOrEqual(0);
      expect(current.treasuryCarryMicro).toBeLessThan(1_000_000);
    }
  });

  /**
   * As projeções que o jogador vê precisam bater com o que o tick realmente faz.
   *
   * A comparação é relativa porque os totais do período são somas de `number`:
   * 8760 parcelas acumulam alguns centésimos de centavo de erro de float. Isso
   * não contamina o dinheiro do país — o tesouro é somado em inteiros, e estes
   * totais servem só para relatórios explicarem o período.
   */
  it('um ano de ticks arrecada o que a projeção anual prometeu', () => {
    const result = runTicks(BASE_SNAPSHOT, BASE_CONTEXT, TICKS_PER_YEAR);

    const revenueRatio =
      result.revenueCents / annualRevenueCents(BASE_SNAPSHOT.taxRate, BASE_CONTEXT);
    const expensesRatio = result.expensesCents / annualExpensesCents(BASE_CONTEXT);

    expect(revenueRatio).toBeCloseTo(1, 9);
    expect(expensesRatio).toBeCloseTo(1, 9);
  });
});
