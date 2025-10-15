"use client";

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

type ThemeToggleProps = { variant?: 'default' | 'secondary' };

export default function ThemeToggle({ variant = 'default' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={[
        'inline-flex h-10 w-10 items-center justify-center rounded-xl transition focus-ring',
        variant === 'secondary'
          ? 'bg-[color:var(--auth-toggle-bg)] text-[color:var(--auth-toggle-foreground)] hover:bg-[color:var(--auth-toggle-hover)]'
          : 'bg-[color:var(--nav-icon-bg)] text-[color:var(--nav-icon-foreground)] hover:bg-[color:var(--nav-icon-hover)]',
      ].join(' ')}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
