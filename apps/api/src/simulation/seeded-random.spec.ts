import { createSeededRandom, seededValue } from './seeded-random';

describe('createSeededRandom', () => {
  it('produz a mesma sequência para a mesma semente', () => {
    const primeira = createSeededRandom(42);
    const segunda = createSeededRandom(42);

    for (let i = 0; i < 20; i += 1) {
      expect(primeira()).toBe(segunda());
    }
  });

  it('produz sequências diferentes para sementes diferentes', () => {
    expect(createSeededRandom(1)()).not.toBe(createSeededRandom(2)());
  });

  it('fica sempre em [0, 1)', () => {
    const random = createSeededRandom(7);

    for (let i = 0; i < 500; i += 1) {
      const value = random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('seededValue', () => {
  /**
   * A propriedade que a simulação em ticks depende: consultar a mesma posição
   * duas vezes dá o mesmo número, em qualquer ordem. Um gerador com estado não
   * teria isso — o resultado dependeria de quantas vezes foi chamado antes.
   */
  it('é consultável em qualquer ordem', () => {
    expect(seededValue(99, 5)).toBe(seededValue(99, 5));
    expect(seededValue(99, 7)).toBe(seededValue(99, 7));
  });

  it('varia com a posição e com a semente', () => {
    expect(seededValue(99, 5)).not.toBe(seededValue(99, 6));
    expect(seededValue(99, 5)).not.toBe(seededValue(100, 5));
  });

  it('fica sempre em [0, 1)', () => {
    for (let position = 0; position < 500; position += 1) {
      const value = seededValue(1_234, position);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  /** Sem espalhar bem, "seca" e "chuva" viriam em blocos previsíveis. */
  it('distribui os valores por toda a faixa', () => {
    const buckets = [0, 0, 0, 0];

    for (let position = 0; position < 400; position += 1) {
      buckets[Math.floor(seededValue(7, position) * 4)]! += 1;
    }

    for (const count of buckets) {
      expect(count).toBeGreaterThan(50);
    }
  });
});
