'use client';

import { useState } from 'react';
import { formatMoney } from '../lib/format';
import { useSetTaxRate } from '../lib/nations';
import type { Economy } from '../lib/schemas';

/**
 * A alíquota neutra do backend, replicada para desenhar a escala.
 *
 * É o único número de regra duplicado no cliente, e só para posicionar uma marca
 * visual — a projeção de receita e o efeito na felicidade continuam vindo do
 * servidor. Se divergir, o pior caso é a marca ficar no lugar errado, nunca um
 * número mentiroso na tela.
 */
const NEUTRAL_TAX_RATE = 20;

/**
 * Controle da decisão econômica do jogador (CLAUDE.md seção 13).
 *
 * O valor arrastado é local até o jogador confirmar: o servidor fecha o período
 * de simulação na alíquota antiga a cada troca, então enviar a cada pixel do
 * arraste geraria dezenas de requisições e nenhuma delas seria o que ele quis.
 *
 * A receita projetada ao lado é a do servidor, referente à alíquota **em vigor**.
 * Enquanto o jogador arrasta, mostramos que o número pendente ainda não vale —
 * projetar no cliente exigiria reimplementar a fórmula do PIB aqui, criando uma
 * segunda regra que sairia de sincronia com a real.
 */
export function TaxRateControl({ economy }: { economy: Economy }) {
  const setTaxRate = useSetTaxRate();
  const [draft, setDraft] = useState(economy.taxRate);
  const [appliedRate, setAppliedRate] = useState(economy.taxRate);

  // O servidor é a fonte da verdade: quando a resposta chega (ou o país é
  // recarregado), o rascunho se alinha ao que de fato foi gravado.
  //
  // O ajuste acontece durante o render, e não em um efeito: um efeito renderiza
  // o valor velho primeiro e só então corrige, causando um piscar. Remontar o
  // componente por `key` também resolveria, mas tiraria o foco do botão que o
  // jogador acabou de acionar.
  if (appliedRate !== economy.taxRate) {
    setAppliedRate(economy.taxRate);
    setDraft(economy.taxRate);
  }

  const isDirty = draft !== economy.taxRate;
  const deficit = economy.annualBalance < 0;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-secondary">Impostos</h2>

      <div className="rounded-lg border border-[var(--border)] bg-surface px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="tax-rate" className="text-sm text-ink-muted">
            Alíquota de imposto
          </label>
          <p className="text-2xl font-semibold tracking-tight">
            {draft}
            <span className="ml-0.5 text-base font-normal text-ink-secondary">%</span>
          </p>
        </div>

        <input
          id="tax-rate"
          type="range"
          min={0}
          max={100}
          step={1}
          value={draft}
          onChange={(event) => setDraft(Number(event.target.value))}
          disabled={setTaxRate.isPending}
          className="mt-3 w-full accent-[var(--status-good)] disabled:opacity-50"
        />

        <div className="flex justify-between text-xs text-ink-muted" aria-hidden="true">
          <span>0%</span>
          <span>{NEUTRAL_TAX_RATE}% neutro</span>
          <span>100%</span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-ink-muted">Receita anual</dt>
            <dd className="mt-0.5 font-medium">{formatMoney(economy.annualRevenue)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Despesa anual</dt>
            <dd className="mt-0.5 font-medium">{formatMoney(economy.annualExpenses)}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Saldo anual</dt>
            <dd
              className="mt-0.5 font-medium"
              style={{ color: deficit ? 'var(--status-critical)' : undefined }}
            >
              {formatMoney(economy.annualBalance, { signed: true })}
              {/* A cor é reforço: o sinal já distingue déficit de superávit. */}
              {deficit ? <span className="ml-1 text-xs font-normal">déficit</span> : null}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setTaxRate.mutate(draft)}
            disabled={!isDirty || setTaxRate.isPending}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm transition hover:border-neutral-500 disabled:opacity-50"
          >
            {setTaxRate.isPending ? 'Aplicando…' : 'Aplicar alíquota'}
          </button>

          {isDirty && !setTaxRate.isPending ? (
            <p className="text-sm text-ink-muted">
              Em vigor: {economy.taxRate}%. Os valores acima ainda são dela.
            </p>
          ) : null}

          {setTaxRate.isError ? (
            <p className="text-sm" style={{ color: 'var(--status-critical)' }} role="alert">
              {setTaxRate.error.message}
            </p>
          ) : null}
        </div>

        <p className="mt-3 text-xs text-ink-muted">
          Acima de {NEUTRAL_TAX_RATE}% o imposto pesa sobre a felicidade, e felicidade baixa faz o
          país perder habitantes para a emigração.
        </p>
      </div>
    </section>
  );
}
