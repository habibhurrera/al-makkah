import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { BRAND } from '@/lib/brand';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-text-muted border-border',
  accent: 'bg-accent-subtle text-brand-800 border-brand-200',
  success: 'bg-success-50 text-success-500 border-success-500/25',
  warning: 'bg-warning-50 text-warning-500 border-warning-500/25',
  danger: 'bg-danger-50 text-danger-500 border-danger-500/25',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        // self-start so the badge never stretches inside a flex column.
        'inline-flex self-start items-center gap-1.5 rounded-sm border px-2 py-1',
        'text-xs font-medium uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The verification badge.
 *
 * It takes a boolean that must originate from Property.verificationStatus in
 * the database. It renders NOTHING when false — there is deliberately no way
 * to show this badge without a backing verification record.
 */
export function VerifiedBadge({ isVerified }: { isVerified: boolean }) {
  if (!isVerified) return null;
  return (
    <Badge tone="success">
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-3.5 shrink-0"
        fill="currentColor"
      >
        <path d="M8 0.8l1.9 1.4 2.3-.2.7 2.2 1.9 1.3-.9 2.2.9 2.2-1.9 1.3-.7 2.2-2.3-.2L8 15.2l-1.9-1.4-2.3.2-.7-2.2L1.2 10.5l.9-2.2-.9-2.2 1.9-1.3.7-2.2 2.3.2L8 .8zm2.9 5.1l-3.7 3.7-2-2-1.1 1.1 3.1 3.1 4.8-4.8-1.1-1.1z" />
      </svg>
      {BRAND.name} Verified
    </Badge>
  );
}
