"use client";

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return systemDark ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSchemeChange = (event: MediaQueryListEvent) => {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored) return; // respect explicit choice
      const next = event.matches ? 'dark' : 'light';
      setThemeState(next);
    };
    media.addEventListener('change', handleSchemeChange);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const value = event.newValue === 'dark' ? 'dark' : 'light';
      setThemeState(value);
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      media.removeEventListener('change', handleSchemeChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch (error) {
      console.warn('Failed to persist theme', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch (error) {
        console.warn('Failed to persist theme', error);
      }
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
