'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea, Select } from '@/components/ui/field';
import type { InquiryKind } from '@/generated/prisma';

type FieldErrors = Record<string, string>;

export function InquiryForm({
  propertyId,
  kind = 'CONTACT',
  compact = false,
  showKindSelect = false,
}: {
  propertyId?: string;
  kind?: InquiryKind;
  compact?: boolean;
  showKindSelect?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setState('sending');
    setErrors({});
    setMessage(null);

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });

      const body = await response.json();

      if (!response.ok) {
        if (body.fieldErrors) setErrors(body.fieldErrors);
        setMessage(body.message ?? 'Something went wrong. Please try again.');
        setState('error');
        return;
      }

      setState('sent');
    } catch {
      setMessage('Could not reach the server. Check your connection.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div role="status" className="flex flex-col gap-2">
        <p className="font-medium">Enquiry sent</p>
        <p className="text-sm text-text-muted">
          We have received your message and will contact you shortly.
        </p>
        <Button variant="ghost" onClick={() => setState('idle')} className="self-start px-0">
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      {propertyId && <input type="hidden" name="propertyId" value={propertyId} />}
      {!showKindSelect && <input type="hidden" name="kind" value={kind} />}

      {/* Honeypot: hidden from people, filled by bots. Must stay empty. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {showKindSelect && (
        <Field id="i-kind" label="I am enquiring about">
          {(p) => (
            <Select {...p} name="kind" defaultValue="CONTACT">
              <option value="BUY">Buying a property</option>
              <option value="RENT">Renting a property</option>
              <option value="SELL">Selling my property</option>
              <option value="CONTACT">Something else</option>
            </Select>
          )}
        </Field>
      )}

      <Field id="i-name" label="Your name" required error={errors.name}>
        {(p) => <Input {...p} name="name" invalid={!!errors.name} autoComplete="name" />}
      </Field>

      <Field
        id="i-phone"
        label="Phone number"
        required
        hint={compact ? undefined : 'We reply on WhatsApp too.'}
        error={errors.phone}
      >
        {(p) => (
          <Input
            {...p}
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="03xx xxxxxxx"
            invalid={!!errors.phone}
            autoComplete="tel"
          />
        )}
      </Field>

      {!compact && (
        <Field id="i-email" label="Email (optional)" error={errors.email}>
          {(p) => (
            <Input {...p} name="email" type="email" invalid={!!errors.email} autoComplete="email" />
          )}
        </Field>
      )}

      <Field id="i-message" label="Message" error={errors.message}>
        {(p) => (
          <Textarea
            {...p}
            name="message"
            rows={compact ? 3 : 5}
            placeholder="Tell us what you are looking for"
            invalid={!!errors.message}
          />
        )}
      </Field>

      {message && (
        <p role="alert" className="text-sm text-danger-500">
          {message}
        </p>
      )}

      <Button type="submit" aria-busy={state === 'sending'} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Send enquiry'}
      </Button>
    </form>
  );
}
