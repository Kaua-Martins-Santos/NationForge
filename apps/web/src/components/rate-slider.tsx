'use client';

import { useState, type ReactNode } from 'react';

/**
 * Um controle de 0 a 100 que só envia quando confirmado.
 *
 * Extraído porque impostos e extração precisam exatamente do mesmo
 * comportamento, e ele tem duas sutilezas que não valia duplicar:
 *
 * 1. **O valor arrastado é local até a confirmação.** No servidor, cada troca
 *    fecha o período de simulação na configuração antiga — enviar a cada pixel
 *    do arraste geraria dezenas de requisições e nenhuma seria o que o jogador
 *    quis.
 * 2. **O alinhamento com o servidor acontece durante o render**, não em um
 *    efeito. Um efeito renderiza o valor velho primeiro e só então corrige,
 *    causando um piscar; remontar por `key` também resolveria, mas tiraria o
 *    foco do botão que o jogador acabou de acionar.
 */
export function RateSlider({
  id,
  label,
  appliedValue,
  unit = '%',
  scale,
  isPending,
  errorMessage,
  onApply,
  children,
}: {
  id: string;
  label: string;
  /** O valor em vigor no servidor — a fonte da verdade. */
  appliedValue: number;
  unit?: string;
  /** Marcas da escala, da esquerda para a direita. */
  scale: string[];
  isPending: boolean;
  errorMessage?: string;
  onApply: (value: number) => void;
  /** Conteúdo entre o slider e o botão: as projeções do domínio. */
  children?: ReactNode;
}) {
  const [draft, setDraft] = useState(appliedValue);
  const [lastApplied, setLastApplied] = useState(appliedValue);

  if (lastApplied !== appliedValue) {
    setLastApplied(appliedValue);
    setDraft(appliedValue);
  }

  const isDirty = draft !== appliedValue;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm text-ink-muted">
          {label}
        </label>
        <p className="text-2xl font-semibold tracking-tight">
          {draft}
          <span className="ml-0.5 text-base font-normal text-ink-secondary">{unit}</span>
        </p>
      </div>

      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={draft}
        onChange={(event) => setDraft(Number(event.target.value))}
        disabled={isPending}
        className="mt-3 w-full accent-[var(--status-good)] disabled:opacity-50"
      />

      <div className="flex justify-between text-xs text-ink-muted" aria-hidden="true">
        {scale.map((mark) => (
          <span key={mark}>{mark}</span>
        ))}
      </div>

      {children}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onApply(draft)}
          disabled={!isDirty || isPending}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm transition hover:border-neutral-500 disabled:opacity-50"
        >
          {isPending ? 'Aplicando…' : 'Aplicar'}
        </button>

        {isDirty && !isPending ? (
          <p className="text-sm text-ink-muted">
            Em vigor: {appliedValue}
            {unit}. Os valores acima ainda são desse.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="text-sm" style={{ color: 'var(--status-critical)' }} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
