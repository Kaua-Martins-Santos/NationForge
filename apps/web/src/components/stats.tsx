import type { ReactNode } from 'react';
import { formatFull } from '../lib/format';

/**
 * Componentes de exibição de números.
 *
 * Os atributos do país são valores pontuais únicos, sem histórico — nada evolui
 * até o sistema de ticks. Por isso não há gráficos aqui: um gráfico exigiria uma
 * série temporal que não existe, e desenhá-lo significaria inventar dados.
 * Também não há indicadores de variação ("+2,4%") pelo mesmo motivo.
 *
 * Rótulos e valores usam tinta de texto, nunca a cor do dado.
 */

/** O número que o painel lidera. Exatamente um por tela. */
export function HeroFigure({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit?: string;
}) {
  return (
    <div>
      <p className="text-sm text-ink-muted">{label}</p>
      {/* Figuras proporcionais (sem tabular-nums): em tamanho grande, tabular
          deixa o número visualmente solto. */}
      <p className="mt-1 text-5xl font-semibold tracking-tight">
        {formatFull(value)}
        {unit ? <span className="ml-2 text-2xl font-normal text-ink-secondary">{unit}</span> : null}
      </p>
    </div>
  );
}

export function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface px-4 py-3">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {value}
        {unit ? (
          <span className="ml-1 text-base font-normal text-ink-secondary">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

const INDEX_MAX = 100;

/**
 * Faixas de severidade de um índice 0–100.
 *
 * A cor é reforço, nunca o único canal: o valor numérico e o rótulo de estado
 * aparecem sempre ao lado, então quem não distingue as cores lê a mesma
 * informação.
 */
function severityOf(value: number): { color: string; label: string } {
  if (value >= 60) {
    return { color: 'var(--status-good)', label: 'estável' };
  }

  if (value >= 30) {
    return { color: 'var(--status-warning)', label: 'atenção' };
  }

  return { color: 'var(--status-critical)', label: 'crítico' };
}

/** Um índice contra o seu limite. Um medidor, não uma pizza de duas fatias. */
export function Meter({ label, value }: { label: string; value: number }) {
  const severity = severityOf(value);
  const percent = Math.max(0, Math.min(INDEX_MAX, value));

  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-ink-muted">{label}</p>
        <p className="text-sm text-ink-secondary">{severity.label}</p>
      </div>

      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {percent}
        <span className="ml-0.5 text-base font-normal text-ink-secondary">/{INDEX_MAX}</span>
      </p>

      {/* A trilha vazia é um passo mais claro da MESMA cor do preenchimento, para
          o estado ser legível na barra inteira.
          Usamos color-mix e não `opacity` no elemento pai: opacity é herdada,
          então ela apagaria também o preenchimento dentro da trilha. */}
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: `color-mix(in srgb, ${severity.color} 22%, transparent)` }}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${percent}%`, backgroundColor: severity.color }}
        />
      </div>
    </div>
  );
}

export function StatGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-secondary">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
    </section>
  );
}
