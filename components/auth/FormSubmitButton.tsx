"use client";

import { useFormStatus } from 'react-dom';
import type { PropsWithChildren } from 'react';

export default function FormSubmitButton({ children, disabled }: PropsWithChildren<{ disabled?: boolean }>) {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled) || pending;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--color-primary-button)] px-4 py-3 text-sm font-semibold text-white transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand',
        isDisabled ? 'opacity-60' : 'hover:opacity-90',
      ].join(' ')}
    >
      {pending && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-white/80" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      <span>{pending ? '送信中…' : children}</span>
    </button>
  );
}
