import type { InputHTMLAttributes, ReactNode } from 'react';

export function Field({
  label,
  error,
  ...inputProps
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-300">{label}</span>
      <input
        {...inputProps}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-400"
      />
      {error ? <span className="text-sm text-red-400">{error}</span> : null}
    </label>
  );
}

export function SubmitButton({ children, pending }: { children: ReactNode; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-md bg-neutral-100 px-4 py-2 font-medium text-neutral-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? 'Enviando…' : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-neutral-400">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}
