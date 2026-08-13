import { TICKS_PER_YEAR } from '../simulation/tick';
import { tickIndexOf, weatherAt, weatherLabel, WEATHER_WINDOW_TICKS } from './weather';

const SEED = 4_242;

describe('weatherAt', () => {
  /**
   * A propriedade que permite existir clima sem quebrar a seção 25: recalcular
   * o mesmo instante dá sempre o mesmo tempo. Sem isso, o jogador recarregaria
   * a página até a seca passar.
   */
  it('é determinístico para o mesmo instante', () => {
    for (let tick = 0; tick < 200; tick += 1) {
      expect(weatherAt(SEED, tick)).toBe(weatherAt(SEED, tick));
    }
  });

  /** Países diferentes em seca e em safra ao mesmo tempo é o que move o comércio. */
  it('dá climas diferentes a países diferentes no mesmo instante', () => {
    const climas = new Set(
      Array.from({ length: 40 }, (_, index) => weatherAt(1_000 + index, 5_000).toFixed(4)),
    );

    expect(climas.size).toBeGreaterThan(30);
  });

  it('mantém o tempo estável dentro de uma mesma janela', () => {
    const inicio = weatherAt(SEED, 0);
    const meio = weatherAt(SEED, Math.floor(WEATHER_WINDOW_TICKS / 2));

    // Não são idênticos porque a estação varia continuamente, mas o período
    // sorteado é o mesmo — a diferença fica muito abaixo de uma virada de clima.
    expect(Math.abs(meio - inicio)).toBeLessThan(0.05);
  });

  it('muda de período a cada janela', () => {
    const janelas = new Set(
      Array.from({ length: 12 }, (_, index) =>
        weatherAt(SEED, index * WEATHER_WINDOW_TICKS).toFixed(4),
      ),
    );

    expect(janelas.size).toBe(12);
  });

  /** Sem extremos não haveria seca nem safra farta — só um número perto de 1. */
  it('produz desde secas até safras excepcionais ao longo dos anos', () => {
    const valores = Array.from({ length: 5 * TICKS_PER_YEAR }, (_, tick) => weatherAt(SEED, tick));

    expect(Math.min(...valores)).toBeLessThan(0.75);
    expect(Math.max(...valores)).toBeGreaterThan(1.2);
  });

  it('nunca zera nem explode o rendimento', () => {
    for (let tick = 0; tick < 3 * TICKS_PER_YEAR; tick += 7) {
      const factor = weatherAt(SEED, tick);

      expect(factor).toBeGreaterThan(0.4);
      expect(factor).toBeLessThan(1.6);
    }
  });
});

describe('weatherLabel', () => {
  it('descreve os extremos e o meio da escala', () => {
    expect(weatherLabel(0.6)).toBe('Seca severa');
    expect(weatherLabel(1)).toBe('Tempo regular');
    expect(weatherLabel(1.3)).toBe('Safra excepcional');
  });
});

describe('tickIndexOf', () => {
  it('conta horas inteiras, ignorando os minutos', () => {
    const hora = new Date('2026-01-01T10:00:00.000Z');
    const mesmaHora = new Date('2026-01-01T10:59:59.000Z');

    expect(tickIndexOf(hora)).toBe(tickIndexOf(mesmaHora));
    expect(tickIndexOf(new Date('2026-01-01T11:00:00.000Z'))).toBe(tickIndexOf(hora) + 1);
  });
});
