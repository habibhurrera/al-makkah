import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-md ' +
  'transition-colors duration-150 ease-standard ' +
  'disabled:opacity-50 disabled:pointer-events-none ' +
  'aria-busy:opacity-70 aria-busy:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-text hover:bg-accent-hover',
  secondary:
    'bg-surface text-text border border-border-strong hover:bg-surface-sunken',
  ghost: 'text-text hover:bg-surface-sunken',
  // For use over the 3D hero and other dark imagery.
  inverse:
    'bg-surface text-text hover:bg-ink-100 border border-transparent',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

/** Same visual treatment for navigation. Never use a button for a link. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  href,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {children}
    </Link>
  );
}
