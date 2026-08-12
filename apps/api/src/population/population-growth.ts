/**
 * Regras de crescimento populacional — funções puras, sem acesso a banco e sem
 * aleatoriedade.
 *
 * Determinismo é requisito, não preferência (CLAUDE.md seção 25): as mesmas
 * entradas devem sempre produzir a mesma saída, para que o resultado seja
 * testável e auditável.
 *
 * ## Um tick de cada vez
 *
 * Este módulo aplica **um** tick. Quem decide quantos ticks se passaram e em que
 * ordem os domínios avançam é o orquestrador (`simulation/simulate.ts`) — porque
 * essa decisão deixou de ser da população no momento em que a economia passou a
 * depender dela.
 *
 * ## O resto acumulado, e por que ele existe
 *
 * **Toda a aritmética é feita em milionésimos de habitante**, e o resto
 * fracionário é persistido. A primeira versão arredondava para habitante inteiro
 * no fim de cada cálculo, descartando a fração: quem recarregava de hora em hora
 * acumulava menos gente que quem esperava um dia. Guardando o resto, todo estado
 * intermediário é exato e os dois caminhos coincidem.
 */

import { MICRO, settleCarry, TICKS_PER_YEAR } from '../simulation/tick';

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
  /** Índices de 0 a 100. */
  health: number;
  education: number;
}

/** Fatores do país que influenciam a demografia, vindos de outros domínios. */
export interface PopulationContext {
  /** Índice de felicidade do país, 0 a 100. */
  happiness: number;
}

/** O que aconteceu com a população em um tick, em habitantes inteiros. */
export interface PopulationTickDelta {
  births: number;
  deaths: number;
  /** Saldo migratório: negativo quando o país perde habitantes. */
  migration: number;
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

/**
 * Aplica um único tick de crescimento populacional.
 *
 * Devolve o novo estado e o que aconteceu no caminho (nascimentos, mortes,
 * migração), para que relatórios possam explicar a mudança ao jogador.
 *
 * O cálculo depende apenas do total **inteiro** de habitantes e das taxas —
 * nunca do resto acumulado. É isso que faz o resultado de N ticks ser
 * independente de como eles foram fatiados entre chamadas.
 */
export function applyPopulationTick(
  snapshot: PopulationSnapshot,
  context: PopulationContext,
): { snapshot: PopulationSnapshot; delta: PopulationTickDelta } {
  const total = Number(snapshot.total);
  const perTick = 1 / TICKS_PER_YEAR;

  const births =
    total * (snapshot.birthRatePerThousand / 1000) * natalityFactor(snapshot.health) * perTick;

  const deaths =
    total * (snapshot.deathRatePerThousand / 1000) * mortalityFactor(snapshot.health) * perTick;

  const migration = total * MAX_ANNUAL_MIGRATION_RATE * migrationPull(context.happiness) * perTick;

  const birthsMicro = Math.round(births * MICRO);
  const deathsMicro = Math.round(deaths * MICRO);
  const migrationMicro = Math.round(migration * MICRO);

  const { whole, remainderMicro } = settleCarry(
    snapshot.growthCarryMicro + birthsMicro - deathsMicro + migrationMicro,
  );

  let newTotal = snapshot.total + BigInt(whole);
  let newCarry = remainderMicro;

  // Uma população não fica negativa: no pior caso o país esvazia.
  if (newTotal < 0n) {
    newTotal = 0n;
    newCarry = 0;
  }

  return {
    snapshot: { ...snapshot, total: newTotal, growthCarryMicro: newCarry },
    delta: {
      births: birthsMicro / MICRO,
      deaths: deathsMicro / MICRO,
      migration: migrationMicro / MICRO,
    },
  };
}

/**
 * Taxa de emprego da população, derivada da educação.
 *
 * É calculada, não armazenada: emprego depende da demanda por trabalho, que
 * pertence à economia. Quando a demanda real existir, esta função passa a
 * olhá-la — em vez de haver um campo desatualizado no banco.
 */
export function employmentRate(education: number): number {
  const BASE_RATE = 0.55;
  const EDUCATION_CONTRIBUTION = 0.3;

  return BASE_RATE + (education / INDEX_MAX) * EDUCATION_CONTRIBUTION;
}

export function employedFrom(total: bigint, education: number): bigint {
  return BigInt(Math.round(Number(total) * employmentRate(education)));
}
