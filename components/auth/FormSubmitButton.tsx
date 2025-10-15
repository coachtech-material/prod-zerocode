"use client";

import { useFormStatus } from 'react-dom';
import { useEffect, useState, type PropsWithChildren } from 'react';

export default function FormSubmitButton({ children, disabled }: PropsWithChildren<{ disabled?: boolean }>) {
  const { pending } = useFormStatus();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isPending = isClient && pending;
  const isDisabled = Boolean(disabled) || isPending;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--brand-strong)] px-4 py-3 text-sm font-semibold text-white transition',
        'focus-ring hover:brightness-105',
        isDisabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      {isPending && (
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-white/80" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      <span>{isPending ? '送信中…' : children}</span>
    </button>
  );
}
