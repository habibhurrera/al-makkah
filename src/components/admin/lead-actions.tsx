'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { setLeadStatus, type ActionResult } from '@/server/actions/admin';

const NEXT_STATUSES = [
  { value: 'IN_PROGRESS', label: 'Mark in progress' },
  { value: 'CLOSED', label: 'Close' },
  { value: 'SPAM', label: 'Spam' },
] as const;

export function LeadActions({
  inquiryId,
  currentStatus,
}: {
  inquiryId: string;
  currentStatus: string;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    setLeadStatus,
    null,
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      {NEXT_STATUSES.filter((option) => option.value !== currentStatus).map(
        (option) => (
          <form key={option.value} action={action}>
            <input type="hidden" name="inquiryId" value={inquiryId} />
            <input type="hidden" name="status" value={option.value} />
            <Button type="submit" size="sm" variant="ghost" aria-busy={pending}>
              {option.label}
            </Button>
          </form>
        ),
      )}
      {state && (
        <span
          role="status"
          className={`text-sm ${state.ok ? 'text-success-500' : 'text-danger-500'}`}
        >
          {state.message}
        </span>
      )}
    </div>
  );
}
