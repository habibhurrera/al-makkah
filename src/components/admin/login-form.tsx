'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { signIn, type LoginState } from '@/server/actions/auth';

const initial: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field id="email" label="Email" required>
        {(p) => (
          <Input
            {...p}
            name="email"
            type="email"
            autoComplete="username"
            autoFocus
            invalid={!!state.error}
          />
        )}
      </Field>

      <Field id="password" label="Password" required>
        {(p) => (
          <Input
            {...p}
            name="password"
            type="password"
            autoComplete="current-password"
            invalid={!!state.error}
          />
        )}
      </Field>

      {state.error && (
        <p role="alert" className="text-sm text-danger-500">
          {state.error}
        </p>
      )}

      <Button type="submit" aria-busy={isPending} disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
