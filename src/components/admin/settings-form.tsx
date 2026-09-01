'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { saveSettings, type ActionResult } from '@/server/actions/admin';

export function SettingsForm({
  initial,
}: {
  initial: {
    officeAddress: string;
    phone: string;
    whatsapp: string;
    email: string;
  };
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    saveSettings,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field id="office" label="Office address">
        {(p) => <Input {...p} name="officeAddress" defaultValue={initial.officeAddress} />}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="phone" label="Phone" hint="Shown as a call button.">
          {(p) => <Input {...p} name="phone" type="tel" defaultValue={initial.phone} />}
        </Field>
        <Field
          id="whatsapp"
          label="WhatsApp"
          hint="Leave empty to use the phone number."
        >
          {(p) => <Input {...p} name="whatsapp" type="tel" defaultValue={initial.whatsapp} />}
        </Field>
      </div>

      <Field id="email" label="Email">
        {(p) => <Input {...p} name="email" type="email" defaultValue={initial.email} />}
      </Field>

      {state && (
        <p
          role="status"
          className={`text-sm ${state.ok ? 'text-success-500' : 'text-danger-500'}`}
        >
          {state.message}
        </p>
      )}

      <Button type="submit" className="self-start" aria-busy={pending} disabled={pending}>
        {pending ? 'Saving…' : 'Save contact details'}
      </Button>
    </form>
  );
}
