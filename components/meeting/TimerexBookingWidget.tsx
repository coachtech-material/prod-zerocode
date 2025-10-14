"use client";

import { useEffect, useRef } from 'react';

const TIMEREX_SCRIPT_ID = 'timerex_embed';
const TIMEREX_WIDGET_URL = 'https://timerex.net/s/yua.k_f2b6/b49a80f5';

declare global {
  interface Window {
    TimerexCalendar?: (options?: Record<string, unknown>) => void;
  }
}

function loadTimerexScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    const existing = document.getElementById(TIMEREX_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.TimerexCalendar) {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Timerex widget')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = TIMEREX_SCRIPT_ID;
    script.src = 'https://asset.timerex.net/js/embed.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Timerex widget'));
    document.body.appendChild(script);
  });
}

export default function TimerexBookingWidget() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return undefined;

    container.setAttribute('data-url', TIMEREX_WIDGET_URL);

    loadTimerexScript()
      .then(() => {
        if (cancelled) return;
        if (typeof window !== 'undefined' && typeof window.TimerexCalendar === 'function') {
          window.TimerexCalendar({
            primary_color: '#1E4B9E',
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <div ref={containerRef} id="timerex_calendar" className="w-full" data-url={TIMEREX_WIDGET_URL} />;
}
