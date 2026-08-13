'use client';

import { formatCompact, formatMoney } from '../lib/format';
import { useSetProductionAllocation } from '../lib/nations';
import type { Production, ProductionLine } from '../lib/schemas';
import { RateSlider } from './rate-slider';

/**
 * Uma linha cujo insumo o país não possui.
 *
 * A linha continua existindo — é uma decisão, e ela volta a valer no dia em que
 * o comércio trouxer o insumo. Mostrá-la desabilitada, em vez de escondê-la,
 * também é o que revela ao jogador que existe indústria possível ali.
 */
function MissingInputLine({ line }: { line: ProductionLine }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium text-ink-secondary">{line.label}</p>
        <p className="text-sm text-ink-muted">sem {line.inputLabel.toLowerCase()}</p>
      </div>

      <p className="mt-1 text-xs text-ink-muted">
        Precisa de {line.inputPerUnit} de {line.inputLabel.toLowerCase()} por unidade. O país não
        tem esse depósito — importar será o caminho.
      </p>
    </div>
  );
}

function ProductionLineControl({
  line,
  isPending,
  errorMessage,
  onApply,
}: {
  line: ProductionLine;
  isPending: boolean;
  errorMessage?: string;
  onApply: (allocation: number) => void;
}) {
  return (
    <RateSlider
      id={`allocation-${line.good}`}
      label={`${line.label} — ${line.inputPerUnit} de ${line.inputLabel.toLowerCase()} por unidade`}
      appliedValue={line.allocation}
      scale={['vender bruto', 'metade', 'beneficiar tudo']}
      isPending={isPending}
      errorMessage={errorMessage}
      onApply={onApply}
    >
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">Produção anual</dt>
          <dd className="mt-0.5 font-medium">{formatCompact(line.annualProduction)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Insumo consumido</dt>
          <dd className="mt-0.5 font-medium">{formatCompact(line.annualInputConsumed)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Ganho sobre vender bruto</dt>
          <dd className="mt-0.5 font-medium">
            {formatMoney(line.annualValueAdded, { signed: true })}
          </dd>
        </div>
      </dl>
    </RateSlider>
  );
}

/**
 * Painel do domínio Produção (CLAUDE.md seção 16).
 *
 * Mostra a decisão da fase — vender o que sai do solo ou beneficiá-lo — e o que
 * a limita: a capacidade industrial. Sem ver o teto, alocar mais pareceria
 * sempre melhor, e a escolha não existiria.
 */
export function ProductionPanel({ production }: { production: Production }) {
  const setAllocation = useSetProductionAllocation();

  const overCapacity = production.capacityUsage > 100;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-secondary">Indústria</h2>

      <div className="rounded-lg border border-[var(--border)] bg-surface px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-sm text-ink-muted">Capacidade industrial</p>
          <p className="text-sm text-ink-secondary">
            {formatMoney(production.annualValueAdded)}{' '}
            <span className="text-ink-muted">agregados ao ano</span>
          </p>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2 text-sm">
          <p className="text-ink-muted">
            {formatCompact(production.annualDemand)} de {formatCompact(production.annualCapacity)}{' '}
            unidades ao ano
          </p>
          <p style={{ color: overCapacity ? 'var(--status-warning)' : undefined }}>
            {production.capacityUsage}% ocupada
          </p>
        </div>

        {/* A barra passa de 100% quando o país pede mais do que processa: o
            excesso é o que precisa ficar visível, então ela satura em cheia e o
            aviso abaixo explica o que está acontecendo. */}
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${
              overCapacity ? 'var(--status-warning)' : 'var(--status-good)'
            } 22%, transparent)`,
          }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(production.capacityUsage, 100)}%`,
              backgroundColor: overCapacity ? 'var(--status-warning)' : 'var(--status-good)',
            }}
          />
        </div>

        <p className="mt-3 text-xs text-ink-muted">
          {overCapacity
            ? 'A demanda passa da capacidade: todas as linhas produzem menos do que foi alocado, e o excedente é vendido bruto. Mais trabalhadores, tecnologia e infraestrutura aumentam o teto.'
            : 'A capacidade vem dos trabalhadores, da tecnologia e da infraestrutura. O que passar dela continua sendo vendido bruto.'}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {production.lines.map((line) => (
          <li key={line.good}>
            {line.hasInput ? (
              <ProductionLineControl
                line={line}
                isPending={setAllocation.isPending && setAllocation.variables?.good === line.good}
                errorMessage={
                  setAllocation.isError && setAllocation.variables?.good === line.good
                    ? setAllocation.error.message
                    : undefined
                }
                onApply={(allocation) => setAllocation.mutate({ good: line.good, allocation })}
              />
            ) : (
              <MissingInputLine line={line} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
