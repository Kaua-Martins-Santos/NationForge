import { RESOURCE_CATALOG, RESOURCE_ORDER } from './resource-catalog';
import { generateEndowment } from './resource-endowment';

describe('generateEndowment', () => {
  it('é determinístico: mesma semente, mesma dotação', () => {
    expect(generateEndowment(12345)).toEqual(generateEndowment(12345));
  });

  it('dá dotações diferentes a países diferentes', () => {
    const assinatura = (seed: number) =>
      generateEndowment(seed)
        .map((deposit) => `${deposit.type}:${deposit.reserves}`)
        .join('|');

    const assinaturas = new Set(Array.from({ length: 50 }, (_, seed) => assinatura(seed + 1_000)));

    // Não exigimos que todas sejam únicas — exigimos variedade, que é o que faz
    // o comércio ter razão de existir.
    expect(assinaturas.size).toBeGreaterThan(30);
  });

  /** Um país sem recurso algum não teria decisão a tomar nesta parte do jogo. */
  it('garante um mínimo de depósitos mesmo com sorteio ruim', () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      expect(generateEndowment(seed).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('nunca repete um recurso no mesmo país', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const types = generateEndowment(seed).map((deposit) => deposit.type);

      expect(new Set(types).size).toBe(types.length);
    }
  });

  it('só gera recursos que existem no catálogo', () => {
    for (const deposit of generateEndowment(999)) {
      expect(RESOURCE_ORDER).toContain(deposit.type);
    }
  });

  it('respeita a faixa de reservas de cada recurso', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      for (const deposit of generateEndowment(seed)) {
        const { min, max } = RESOURCE_CATALOG[deposit.type].reserveRange;

        expect(deposit.reserves).toBeGreaterThanOrEqual(BigInt(min));
        expect(deposit.reserves).toBeLessThanOrEqual(BigInt(max));
      }
    }
  });

  /**
   * A raridade do catálogo precisa se refletir no resultado, senão os pesos
   * seriam decorativos e todo país teria praticamente tudo.
   */
  it('gera recursos comuns com mais frequência que raros', () => {
    const contagem = { WATER: 0, GOLD: 0 };

    for (let seed = 1; seed <= 500; seed += 1) {
      for (const deposit of generateEndowment(seed)) {
        if (deposit.type === 'WATER') contagem.WATER += 1;
        if (deposit.type === 'GOLD') contagem.GOLD += 1;
      }
    }

    expect(contagem.WATER).toBeGreaterThan(contagem.GOLD * 3);
  });
});
