import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-md border bg-surface px-3 text-base text-text ' +
  'placeholder:text-text-subtle transition-colors duration-150 ease-standard ' +
  'disabled:bg-surface-sunken disabled:text-text-subtle';

const controlValid = 'border-border-strong hover:border-ink-400';
const controlInvalid = 'border-danger-500';

/**
 * Label + control + error, wired together for screen readers.
 * Every form control on the site goes through this so no input ever ships
 * without a programmatic label.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
    required?: boolean;
  }) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required && (
          <span className="text-danger-500" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required,
      })}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(control, 'h-11', invalid ? controlInvalid : controlValid, className)}
      {...props}
    />
  );
}

export function Select({
  className,
  invalid,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(control, 'h-11', invalid ? controlInvalid : controlValid, className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        control,
        'py-2.5 min-h-28 resize-y',
        invalid ? controlInvalid : controlValid,
        className,
      )}
      {...props}
    />
  );
}
