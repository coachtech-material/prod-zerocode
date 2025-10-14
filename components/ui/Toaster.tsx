"use client";
import { useEffect, useState } from 'react';

type Toast = { id: number; message: string; type?: 'success' | 'error' | 'info' };

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let idCounter = 1;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message: string; type?: Toast['type'] };
      if (!detail?.message) return;
      const id = idCounter++;
      setToasts((list) => [...list, { id, message: detail.message, type: detail.type || 'info' }]);
      setTimeout(() => {
        setToasts((list) => list.filter((t) => t.id !== id));
      }, 3500);
    };
    window.addEventListener('app:toast', handler as EventListener);
    return () => window.removeEventListener('app:toast', handler as EventListener);
  }, []);

  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[70] flex max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[
            'pointer-events-auto rounded-xl border px-3 py-2 shadow-lg backdrop-blur',
            t.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-100'
              : t.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
              : 'border-brand-sky/30 bg-brand-sky/10 text-slate-800',
          ].join(' ')}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

