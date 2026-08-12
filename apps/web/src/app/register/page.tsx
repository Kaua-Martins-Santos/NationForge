'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthCard, Field, FormError, SubmitButton } from '../../components/form';
import { useRegister } from '../../lib/auth';
import { registerFormSchema } from '../../lib/schemas';

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsed = registerFormSchema.safeParse({
      email: formData.get('email'),
      displayName: formData.get('displayName'),
      password: formData.get('password'),
    });

    if (!parsed.success) {
      // Validação local só para dar retorno imediato. A validação que vale é a
      // do backend, que roda de novo sobre a mesma requisição.
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
    register.mutate(parsed.data, { onSuccess: () => router.push('/') });
  }

  return (
    <AuthCard title="Criar conta" subtitle="Escolha seu nome de jogador para começar.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Field
          label="Nome do jogador"
          name="displayName"
          autoComplete="username"
          error={fieldErrors.displayName}
        />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          error={fieldErrors.password}
        />

        <FormError message={register.error?.message} />
        <SubmitButton pending={register.isPending}>Criar conta</SubmitButton>
      </form>

      <p className="text-sm text-neutral-400">
        Já tem conta?{' '}
        <Link href="/login" className="text-neutral-200 underline">
          Entrar
        </Link>
      </p>
    </AuthCard>
  );
}
