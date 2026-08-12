/**
 * Regras de crescimento populacional — funções puras, sem acesso a banco e sem
 * aleatoriedade.
 *
 * Determinismo é requisito, não preferência (CLAUDE.md seção 25): as mesmas
 * entradas devem sempre produzir a mesma saída, para que o resultado seja
 * testável e auditável.
 *
 * ## O tick e o motivo de ele existir
 *
 * O país evolui mesmo com o jogador offline (seção 26). Em vez de manter uma
 * simulação rodando, calculamos o que aconteceu com base no tempo decorrido — o
 * que abre uma brecha óbvia: se o cálculo usasse "agora" como marco, recarregar a
 * página várias vezes aplicaria crescimento repetidamente.
 *
 * A defesa tem três partes, e a terceira só apareceu porque um teste a cobrava:
 *
 * 1. O tempo é dividido em ticks de 1 hora e **só ticks inteiros são aplicados**;
 *    o marco avança em múltiplos exatos da duração do tick, nunca para "agora".
 *    O resto de tempo fica guardado para o próximo cálculo.
 * 2. Cada tick é aplicado **individualmente, em laço**, para que 10 ticks de uma
 *    vez equivalham a 1 tick dez vezes.
 * 3. **Toda a aritmética é feita em inteiros de milionésimos de habitante**, e o
 *    resto fracionário é persistido. A primeira versão arredondava para habitante
 *    inteiro no fim de cada cálculo, descartando a fração: quem recarregava de
 *    hora em hora acumulava menos gente que quem esperava um dia. Guardando o
 *    resto, todo estado intermediário é exato e os dois caminhos coincidem.
 */

/** 1 tick = 1 hora do jogo (CLAUDE.md seção 25). */
export const TICK_DURATION_MS = 60 * 60 * 1000;

const HOURS_PER_YEAR = 8760;

/** Milionésimos de habitante: a unidade interna de todo o cálculo. */
const MICRO = 1_000_000;

/**
 * Teto de ticks aplicados em um único cálculo (1 ano).
 *
 * Limita o custo do laço para um jogador que voltou depois de muito tempo. Um ano
 * de ausência já é um caso extremo, e 8760 iterações de aritmética são triviais.
 */
export const MAX_CATCH_UP_TICKS = HOURS_PER_YEAR;

const INDEX_NEUTRAL = 50;
const INDEX_MAX = 100;

/** No extremo da infelicidade, o país perde 2% da população por ano. */
const MAX_ANNUAL_MIGRATION_RATE = 0.02;

export interface PopulationSnapshot {
  total: bigint;
  /** Resto fracionário do crescimento, em milionésimos de habitante. */
  growthCarryMicro: number;
  birthRatePerThousand: number;
  deathRatePerThousand: number;
  /** Índice de saúde, 0 a 100. */
  health: number;
}

/** Fatores do país que influenciam a demografia, vindos de outros domínios. */
export interface PopulationContext {
  /** Índice de felicidade do país, 0 a 100. */
  happiness: number;
}

export interface PopulationProjection {
  total: bigint;
  growthCarryMicro: number;
  /** Nascimentos acumulados no período, em habitantes inteiros. */
  births: bigint;
  deaths: bigint;
  /** Saldo migratório: negativo quando o país perde habitantes. */
  migration: bigint;
  /** Quantos ticks foram efetivamente aplicados. */
  appliedTicks: number;
  /** Até quando a simulação passou a estar aplicada. */
  simulatedUntil: Date;
}

/**
 * Saúde acima da média aumenta os nascimentos; abaixo, reduz.
 * Varia de 0,5 (saúde 0) a 1,5 (saúde 100).
 */
function natalityFactor(health: number): number {
  return 0.5 + health / INDEX_MAX;
}

/**
 * O espelho da natalidade: saúde ruim aumenta a mortalidade.
 * Varia de 1,5 (saúde 0) a 0,5 (saúde 100).
 */
function mortalityFactor(health: number): number {
  return 1.5 - health / INDEX_MAX;
}

/**
 * Felicidade acima do neutro atrai imigrantes; abaixo, provoca emigração.
 * Varia de -1 (felicidade 0) a +1 (felicidade 100).
 */
function migrationPull(happiness: number): number {
  return (happiness - INDEX_NEUTRAL) / INDEX_NEUTRAL;
}

/** Quantos ticks inteiros cabem entre o marco da simulação e agora. */
export function countElapsedTicks(simulatedUntil: Date, now: Date): number {
  const elapsedMs = now.getTime() - simulatedUntil.getTime();

  if (elapsedMs <= 0) {
    return 0;
  }

  return Math.min(Math.floor(elapsedMs / TICK_DURATION_MS), MAX_CATCH_UP_TICKS);
}

interface TickDelta {
  birthsMicro: number;
  deathsMicro: number;
  migrationMicro: number;
}

/**
 * Efeito de um único tick, em milionésimos de habitante.
 *
 * Depende apenas do total inteiro de habitantes e das taxas — nunca do resto
 * acumulado. É isso que faz o resultado de N ticks ser independente de como eles
 * foram fatiados entre chamadas.
 */
function tickDelta(
  total: number,
  snapshot: PopulationSnapshot,
  context: PopulationContext,
): TickDelta {
  const perTick = 1 / HOURS_PER_YEAR;

  const births =
    total * (snapshot.birthRatePerThousand / 1000) * natalityFactor(snapshot.health) * perTick;

  const deaths =
    total * (snapshot.deathRatePerThousand / 1000) * mortalityFactor(snapshot.health) * perTick;

  const migration = total * MAX_ANNUAL_MIGRATION_RATE * migrationPull(context.happiness) * perTick;

  return {
    birthsMicro: Math.round(births * MICRO),
    deathsMicro: Math.round(deaths * MICRO),
    migrationMicro: Math.round(migration * MICRO),
  };
}

/**
 * Projeta a população do marco atual até agora.
 *
 * Devolve o novo estado e o que aconteceu no caminho (nascimentos, mortes,
 * migração), para que relatórios possam explicar a mudança ao jogador.
 */
export function projectPopulation(
  snapshot: PopulationSnapshot,
  context: PopulationContext,
  simulatedUntil: Date,
  now: Date,
): PopulationProjection {
  const appliedTicks = countElapsedTicks(simulatedUntil, now);

  if (appliedTicks === 0) {
    return {
      total: snapshot.total,
      growthCarryMicro: snapshot.growthCarryMicro,
      births: 0n,
      deaths: 0n,
      migration: 0n,
      appliedTicks: 0,
      simulatedUntil,
    };
  }

  let total = snapshot.total;
  let carry = snapshot.growthCarryMicro;

  let birthsMicro = 0;
  let deathsMicro = 0;
  let migrationMicro = 0;

  for (let tick = 0; tick < appliedTicks; tick += 1) {
    const delta = tickDelta(Number(total), snapshot, context);

    birthsMicro += delta.birthsMicro;
    deathsMicro += delta.deathsMicro;
    migrationMicro += delta.migrationMicro;

    carry += delta.birthsMicro - delta.deathsMicro + delta.migrationMicro;

    // Move do resto para habitantes inteiros. floor (e não trunc) mantém o resto
    // sempre em [0, MICRO), inclusive quando o país está encolhendo.
    const wholePeople = Math.floor(carry / MICRO);

    if (wholePeople !== 0) {
      total += BigInt(wholePeople);
      carry -= wholePeople * MICRO;
    }

    // Uma população não fica negativa: no pior caso o país esvazia.
    if (total < 0n) {
      total = 0n;
      carry = 0;
    }
  }

  return {
    total,
    growthCarryMicro: carry,
    births: BigInt(Math.round(birthsMicro / MICRO)),
    deaths: BigInt(Math.round(deathsMicro / MICRO)),
    migration: BigInt(Math.round(migrationMicro / MICRO)),
    appliedTicks,
    // Avança em múltiplos exatos do tick, não para "agora": o tempo restante
    // continua valendo para o próximo cálculo.
    simulatedUntil: new Date(simulatedUntil.getTime() + appliedTicks * TICK_DURATION_MS),
  };
}

/**
 * Taxa de emprego da população, derivada da educação.
 *
 * É calculada, não armazenada: emprego depende da demanda por trabalho, que
 * pertence à economia. Quando a economia existir, esta função é substituída por
 * uma que olhe a demanda real — em vez de haver um campo desatualizado no banco.
 */
export function employmentRate(education: number): number {
  const BASE_RATE = 0.55;
  const EDUCATION_CONTRIBUTION = 0.3;

  return BASE_RATE + (education / INDEX_MAX) * EDUCATION_CONTRIBUTION;
}

export function employedFrom(total: bigint, education: number): bigint {
  return BigInt(Math.round(Number(total) * employmentRate(education)));
}
