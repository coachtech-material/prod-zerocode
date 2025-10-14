import LayoutShell from '@/components/layout/LayoutShell';
import { requireRole } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole(['user', 'staff', 'admin']);
  return <LayoutShell role={profile.role}>{children}</LayoutShell>;
}
