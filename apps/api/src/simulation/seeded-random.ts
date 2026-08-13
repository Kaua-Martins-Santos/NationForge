/**
 * Aleatoriedade reproduzível, compartilhada pelos domínios.
 *
 * Mora aqui, ao lado do tick, pelo mesmo motivo que ele: não pertence a domínio
 * nenhum. A dotação natural sorteia depósitos com isto (Fase 12) e o clima
 * sorteia secas e chuvas (Fase 14) — e nenhum dos dois deveria depender do
 * outro para existir.
 *
 * `Math.random()` não serviria: não aceita semente, então o resultado não seria
 * reproduzível. E uma dependência externa para seis linhas seria a "tecnologia
 * sem necessidade" que a seção 7 pede para evitar.
 */

/**
 * Gerador pseudoaleatório com semente (mulberry32).
 *
 * Cada chamada avança o estado e devolve um número em [0, 1).
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Um único número em [0, 1) a partir de duas entradas.
 *
 * Serve para "sortear" algo que depende de uma semente **e** de uma posição —
 * o clima de uma janela de tempo, por exemplo. Diferente de guardar um gerador
 * e ir avançando, isto é consultável em qualquer ordem e sempre dá o mesmo
 * resultado para o mesmo par, que é o que a simulação em ticks precisa: o valor
 * de um instante não pode depender de quantas vezes o jogador abriu o jogo.
 */
export function seededValue(seed: number, position: number): number {
  return createSeededRandom((seed ^ Math.imul(position, 0x9e3779b1)) >>> 0)();
}
