'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthCard, Field, FormError, SubmitButton } from '../../components/form';
import { useLogin } from '../../lib/auth';
import { loginFormSchema } from '../../lib/schemas';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const parsed = loginFormSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
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
    login.mutate(parsed.data, { onSuccess: () => router.push('/') });
  }

  return (
    <AuthCard title="Entrar" subtitle="Acesse seu país.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          error={fieldErrors.password}
        />

        <FormError message={login.error?.message} />
        <SubmitButton pending={login.isPending}>Entrar</SubmitButton>
      </form>

      <p className="text-sm text-neutral-400">
        Não tem conta?{' '}
        <Link href="/register" className="text-neutral-200 underline">
          Criar conta
        </Link>
      </p>
    </AuthCard>
  );
}
