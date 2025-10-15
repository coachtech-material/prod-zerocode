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
    'group relative my-1 flex h-11 items-center rounded-xl text-[15px] text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)] focus-ring';
  const layout = showLabel ? 'gap-3 px-3' : 'w-11 justify-center';

  return (
    <Link
      href={href}
      className={[base, layout, active ? 'bg-[#103a5d] text-[var(--text)] shadow-[0_8px_24px_rgba(0,0,0,0.35)]' : ''].join(' ')}
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
