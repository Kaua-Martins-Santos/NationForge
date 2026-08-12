'use client';

import { formatMoney } from '../lib/format';
import { useSetTaxRate } from '../lib/nations';
import type { Economy } from '../lib/schemas';
import { RateSlider } from './rate-slider';

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
 * A receita projetada é a do servidor, referente à alíquota **em vigor** —
 * projetar no cliente exigiria reimplementar a fórmula do PIB aqui, criando uma
 * segunda regra que sairia de sincronia com a real.
 */
export function TaxRateControl({ economy }: { economy: Economy }) {
  const setTaxRate = useSetTaxRate();
  const deficit = economy.annualBalance < 0;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-secondary">Impostos</h2>

      <RateSlider
        id="tax-rate"
        label="Alíquota de imposto"
        appliedValue={economy.taxRate}
        scale={['0%', `${NEUTRAL_TAX_RATE}% neutro`, '100%']}
        isPending={setTaxRate.isPending}
        errorMessage={setTaxRate.isError ? setTaxRate.error.message : undefined}
        onApply={(value) => setTaxRate.mutate(value)}
      >
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

        <p className="mt-3 text-xs text-ink-muted">
          Acima de {NEUTRAL_TAX_RATE}% o imposto pesa sobre a felicidade, e felicidade baixa faz o
          país perder habitantes para a emigração.
        </p>
      </RateSlider>
    </section>
  );
}
