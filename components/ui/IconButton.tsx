"use client";
import * as React from 'react';

type Variant = 'default' | 'inverted' | 'ghost';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'md';
  variant?: Variant;
  'aria-label': string;
};

export function IconButton({ size = 'md', variant = 'default', className = '', ...props }: Props) {
  const sizes = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const variantStyles: Record<Variant, string> = {
    default:
      'bg-[color:var(--surface-1)] border border-[color:var(--line)] text-[color:var(--brand)] hover:bg-[color:var(--surface-1-hover)] shadow-[var(--shadow-1)]',
    inverted:
      'bg-[color:var(--brand-strong)] text-white hover:brightness-110 shadow-[var(--shadow-1)]',
    ghost:
      'bg-[color:var(--nav-icon-bg)] text-[color:var(--nav-icon-foreground)] hover:bg-[color:var(--nav-icon-hover)]',
  };

  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center rounded-xl transition-colors focus-ring',
        variantStyles[variant],
        sizes,
        className,
      ].filter(Boolean).join(' ')}
    />
  );
}
