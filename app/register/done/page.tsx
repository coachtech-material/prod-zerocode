import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { readOnboardingState } from '@/lib/onboarding/state';
import { requireRole } from '@/lib/auth/requireRole';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function RegisterDonePage() {
  const { profile } = await requireRole(['user', 'staff', 'admin']);
  const state = readOnboardingState();
  if ((state.step ?? 1) < 5) {
    redirect('/register/profile');
  }

  const supabase = createServerSupabaseClient();
  await supabase
    .from('profiles')
    .update({ onboarding_step: 5, onboarding_completed: true })
    .eq('id', profile.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-[color:var(--color-text)]">全てのステップが完了しました！</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">会員登録、お疲れ様でした！<br />ここから始まる14日間があなたの人生を変えます🚀<br />エンジニアとして第一歩を踏み出しましょう！</p>
      </div>
      <div className="relative h-96 w-full max-w-md overflow-hidden">
        <Image src="/onboarding2.jpg" alt="onboarding" fill className="object-cover" sizes="320px" />
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-xl bg-brand-yellow px-6 py-3 text-base font-semibold text-brand hover:bg-brand-yellow/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        学習を始める
      </Link>
    </div>
  );
}
