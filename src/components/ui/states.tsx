import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Loading placeholder. Shapes should match the content they stand in for. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-sunken', className)}
      aria-hidden="true"
    />
  );
}

/** A property card's loading shape — used by every listing grid. */
export function PropertyCardSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-5 flex flex-col gap-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/** Shown when a filtered search legitimately returns nothing. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-6">
      <h3 className="font-display text-xl text-text">{title}</h3>
      {description && (
        <p className="text-text-muted max-w-[46ch]">{description}</p>
      )}
      {action}
    </div>
  );
}

/** Shown when something actually failed. Never a blank screen. */
export function ErrorState({
  title = 'Something went wrong',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center text-center gap-3 py-16 px-6"
    >
      <h3 className="font-display text-xl text-danger-500">{title}</h3>
      {description && (
        <p className="text-text-muted max-w-[46ch]">{description}</p>
      )}
      {action}
    </div>
  );
}
