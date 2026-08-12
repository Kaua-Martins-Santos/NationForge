'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Field, FormError, SubmitButton } from '../../../components/form';
import { RequireSession } from '../../../components/require-session';
import { useCreateNation, useNation } from '../../../lib/nations';
import {
  createNationFormSchema,
  GOVERNMENT_LABELS,
  GOVERNMENT_TYPES,
  type CreateNationFormValues,
} from '../../../lib/schemas';

function CreateNationForm() {
  const router = useRouter();
  const nation = useNation();
  const createNation = useCreateNation();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Quem já tem país não deveria estar aqui: um país por jogador, e o backend
  // responderia 409.
  const alreadyHasNation = nation.isSuccess && nation.data !== null;

  useEffect(() => {
    if (alreadyHasNation) {
      router.replace('/dashboard');
    }
  }, [alreadyHasNation, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsed = createNationFormSchema.safeParse({
      name: formData.get('name'),
      flag: formData.get('flag'),
      capital: formData.get('capital'),
      government: formData.get('government'),
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    createNation.mutate(parsed.data satisfies CreateNationFormValues, {
      onSuccess: () => router.push('/dashboard'),
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fundar seu país</h1>
        <p className="mt-1 text-ink-secondary">
          Escolha a identidade da sua nação. Os atributos iniciais — população, tesouro, PIB — são
          definidos pelo servidor, iguais para todos os jogadores.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Nome do país" name="name" error={fieldErrors.name} />
        <Field label="Bandeira (emoji)" name="flag" placeholder="🏳️" error={fieldErrors.flag} />
        <Field label="Capital" name="capital" error={fieldErrors.capital} />

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-300">Forma de governo</span>
          <select
            name="government"
            defaultValue="REPUBLIC"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-400"
          >
            {GOVERNMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {GOVERNMENT_LABELS[type]}
              </option>
            ))}
          </select>
          {fieldErrors.government ? (
            <span className="text-sm text-red-400">{fieldErrors.government}</span>
          ) : null}
        </label>

        <FormError message={createNation.error?.message} />
        <SubmitButton pending={createNation.isPending}>Fundar país</SubmitButton>
      </form>
    </main>
  );
}

export default function NewNationPage() {
  return (
    <RequireSession>
      <CreateNationForm />
    </RequireSession>
  );
}
