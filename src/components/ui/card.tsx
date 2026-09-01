import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  interactive = false,
  children,
}: {
  className?: string;
  /** Adds hover elevation. Only for cards that are entirely a link. */
  interactive?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-surface-raised border border-border rounded-lg overflow-hidden',
        'shadow-card',
        interactive &&
          'transition-shadow duration-200 ease-standard hover:shadow-card-hover',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
