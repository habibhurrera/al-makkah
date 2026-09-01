import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Standard page gutter and max width. Every section uses this. */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-[80rem] px-5 md:px-8', className)}>
      {children}
    </div>
  );
}

/** Vertical rhythm between homepage sections. */
export function Section({
  className,
  tone = 'default',
  children,
}: {
  className?: string;
  tone?: 'default' | 'sunken' | 'inverse';
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'py-16 md:py-24',
        tone === 'sunken' && 'bg-surface-sunken',
        tone === 'inverse' && 'bg-surface-inverse text-text-inverse',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 max-w-[52ch]', className)}>
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl md:text-4xl text-balance">{title}</h2>
      {description && (
        <p className="text-text-muted text-lg text-pretty">{description}</p>
      )}
    </div>
  );
}
