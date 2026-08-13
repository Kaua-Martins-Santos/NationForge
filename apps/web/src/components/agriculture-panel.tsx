'use client';

import { formatCompact, formatMoney } from '../lib/format';
import { useSetFarmlandShare } from '../lib/nations';
import type { Agriculture } from '../lib/schemas';
import { RateSlider } from './rate-slider';

/** Quantos dias de estoque separam tranquilidade de risco. */
const COMFORTABLE_STOCK_DAYS = 90;
const CRITICAL_STOCK_DAYS = 30;

/**
 * Painel do domínio Agricultura (CLAUDE.md seção 15).
 *
 * Três números decidem a fase e por isso ficam lado a lado: o que o país colhe,
 * o que ele come e por quantos dias o estoque cobre a diferença. O clima aparece
 * junto porque é ele que explica uma colheita menor sem que nada tenha mudado na
 * decisão do jogador.
 */
export function AgriculturePanel({ agriculture }: { agriculture: Agriculture }) {
  const setFarmlandShare = useSetFarmlandShare();

  const deficit = agriculture.annualBalance < 0;

  // A cor é reforço: os dias de estoque e o sinal do saldo já dizem o mesmo.
  const stockSeverity =
    agriculture.stockDays >= COMFORTABLE_STOCK_DAYS
      ? 'var(--status-good)'
      : agriculture.stockDays >= CRITICAL_STOCK_DAYS
        ? 'var(--status-warning)'
        : 'var(--status-critical)';

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-secondary">Agricultura</h2>

      <div className="rounded-lg border border-[var(--border)] bg-surface px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm text-ink-muted">Estoque de alimento</p>
          <p className="text-sm text-ink-secondary">{agriculture.weatherLabel}</p>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
          <p className="text-ink-muted">{formatCompact(agriculture.foodStock)} toneladas</p>
          <p style={{ color: stockSeverity }}>
            {agriculture.stockDays >= 999
              ? '999+ dias'
              : `${formatCompact(agriculture.stockDays)} dias de consumo`}
          </p>
        </div>

        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: `color-mix(in srgb, ${stockSeverity} 22%, transparent)` }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min((agriculture.stockDays / COMFORTABLE_STOCK_DAYS) * 100, 100)}%`,
              backgroundColor: stockSeverity,
            }}
          />
        </div>
      </div>

      <RateSlider
        id="farmland-share"
        label="Território dedicado à lavoura"
        appliedValue={agriculture.farmlandShare}
        scale={['nenhum', 'metade', 'todo']}
        isPending={setFarmlandShare.isPending}
        errorMessage={setFarmlandShare.isError ? setFarmlandShare.error.message : undefined}
        onApply={(value) => setFarmlandShare.mutate(value)}
      >
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-muted">Colheita anual</dt>
            <dd className="mt-0.5 font-medium">{formatCompact(agriculture.annualProduction)} t</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Consumo anual</dt>
            <dd className="mt-0.5 font-medium">{formatCompact(agriculture.annualConsumption)} t</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Saldo anual</dt>
            <dd
              className="mt-0.5 font-medium"
              style={{ color: deficit ? 'var(--status-critical)' : undefined }}
            >
              {agriculture.annualBalance > 0 ? '+' : ''}
              {formatCompact(agriculture.annualBalance)} t
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Custo anual</dt>
            <dd className="mt-0.5 font-medium">{formatMoney(agriculture.annualCost)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-ink-muted">
          {deficit
            ? `A colheita não cobre o consumo: o país come do estoque, e quando ele acabar vem a fome — que derruba a felicidade e faz o povo emigrar. Plantado: ${formatCompact(agriculture.farmlandArea)} km².`
            : `Manter a lavoura custa tesouro todo tick, e o tempo manda na colheita — a projeção acima já é a do clima de agora. Plantado: ${formatCompact(agriculture.farmlandArea)} km².`}
        </p>
      </RateSlider>
    </section>
  );
}
