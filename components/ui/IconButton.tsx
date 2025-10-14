"use client";
import * as React from 'react';

type Variant = 'default' | 'inverted';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'md';
  variant?: Variant;
  'aria-label': string;
};

export function IconButton({ size = 'md', variant = 'default', className = '', ...props }: Props) {
  const sizes = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const base =
    variant === 'inverted'
      ? 'bg-white/15 hover:bg-white/25 text-white shadow-[0_4px_16px_rgba(255,255,255,0.15)]'
      : 'bg-brand-sky/10 hover:bg-brand-sky/20 text-brand-sky shadow-[0_4px_16px_rgba(2,129,202,0.25)]';
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center rounded-xl transition-colors',
        base,
        'focus-ring',
        sizes,
        className,
      ].join(' ')}
    />
  );
}
