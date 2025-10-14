import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/requireRole';
import DashboardScreen from '@/components/dashboard/DashboardScreen';

export default async function DashboardPage() {
  const { profile } = await requireRole(['user', 'staff', 'admin']);
  if (profile.role === 'admin') {
    redirect('/admin');
  }

  return <DashboardScreen />;
}
