'use client';

import { formatCompact, formatMoney } from '../lib/format';
import { useSetExtractionRate } from '../lib/nations';
import type { Deposit, Resources } from '../lib/schemas';
import { RateSlider } from './rate-slider';

/**
 * Quanto da reserva original ainda resta.
 *
 * Só pode ser estimado: o servidor manda o que sobrou e o que já saiu, e a soma
 * dos dois é a reserva de origem. Isso funciona porque a extração conserva o
 * total — nada é criado nem perdido no caminho.
 */
function remainingShare(deposit: Deposit): number {
  const original = deposit.reserves + deposit.extractedTotal;

  return original === 0 ? 0 : (deposit.reserves / original) * 100;
}

function DepositRow({ deposit }: { deposit: Deposit }) {
  const remaining = remainingShare(deposit);

  // Faixas de esgotamento. A cor é reforço: o percentual e o texto de anos
  // restantes dizem a mesma coisa para quem não distingue as cores.
  const severity =
    remaining >= 60
      ? 'var(--status-good)'
      : remaining >= 25
        ? 'var(--status-warning)'
        : 'var(--status-critical)';

  return (
    <li className="rounded-lg border border-[var(--border)] bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">{deposit.label}</p>
        <p className="text-sm text-ink-secondary">
          {formatMoney(deposit.annualRevenue)} <span className="text-ink-muted">ao ano</span>
        </p>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
        <p className="text-ink-muted">
          {formatCompact(deposit.reserves)} restantes
          <span className="ml-1 text-xs">({Math.round(remaining)}% da reserva)</span>
        </p>
        <p className="text-ink-muted">
          {deposit.yearsRemaining === null
            ? 'sem extração'
            : `~${formatCompact(deposit.yearsRemaining)} anos`}
        </p>
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${severity} 22%, transparent)` }}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${remaining}%`, backgroundColor: severity }}
        />
      </div>
    </li>
  );
}

/**
 * Painel do domínio Recursos (CLAUDE.md seção 14).
 *
 * Mostra a dotação natural do país e a decisão que ela habilita: extrair rápido
 * rende agora, esgota depois. Cada depósito exibe o que resta e por quanto tempo
 * ainda dura no ritmo atual — sem isso, escolher a intensidade seria adivinhação.
 */
export function ResourcesPanel({ resources }: { resources: Resources }) {
  const setExtractionRate = useSetExtractionRate();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-secondary">Recursos naturais</h2>

      <RateSlider
        id="extraction-rate"
        label="Intensidade de extração"
        appliedValue={resources.extractionRate}
        scale={['parada', 'moderada', 'máxima']}
        isPending={setExtractionRate.isPending}
        errorMessage={setExtractionRate.isError ? setExtractionRate.error.message : undefined}
        onApply={(value) => setExtractionRate.mutate(value)}
      >
        <dl className="mt-4 text-sm">
          <dt className="text-ink-muted">Receita anual da extração</dt>
          <dd className="mt-0.5 font-medium">{formatMoney(resources.annualRevenue)}</dd>
        </dl>

        <p className="mt-3 text-xs text-ink-muted">
          As reservas são finitas: o que sai do solo não volta. Extrair mais rápido também aumenta
          as emissões.
        </p>
      </RateSlider>

      {resources.deposits.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {resources.deposits.map((deposit) => (
            <DepositRow key={deposit.type} deposit={deposit} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">
          Este país não tem depósitos conhecidos. Comércio com outras nações será o caminho para
          obter recursos.
        </p>
      )}
    </section>
  );
}
