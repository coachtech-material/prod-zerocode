"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

type Props = {
  href: string;
  label: string;
  icon: LucideIcon;
  showLabel?: boolean;
  onSelect?: () => void;
};

export default function SidebarItem({ href, label, icon: Icon, showLabel = true, onSelect }: Props) {
  const pathname = usePathname();
  const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
  const base =
    'group relative my-1 flex h-11 w-full items-center rounded-xl text-[15px] text-[var(--muted)] transition-colors focus-ring';
  const layout = showLabel
    ? 'gap-3 px-3 hover:bg-white/5 hover:text-[var(--text)]'
    : 'mx-auto w-12 justify-center rounded-xl hover:bg-white/10 hover:text-[var(--text)]';
  const activeClass = showLabel
    ? 'bg-[#103a5d] text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
    : 'bg-brand/20 text-brand shadow-none';

  return (
    <Link
      href={href}
      className={[base, layout, active ? activeClass : 'hover:bg-white/5 hover:text-[var(--text)]'].join(' ')}
      aria-current={active ? 'page' : undefined}
      aria-label={showLabel ? undefined : label}
      title={showLabel ? undefined : label}
      onClick={onSelect}
    >
      <Icon className="shrink-0" size={20} />
      {showLabel && <span className="truncate">{label}</span>}
    </Link>
  );
}
