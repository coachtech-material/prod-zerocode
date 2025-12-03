import { requireRole } from '@/lib/auth/requireRole';

export default async function AdminLessonsPage() {
  await requireRole(['staff','admin'], {
    redirectTo: '/ops-login',
    signOutOnFail: true,
    requireOnboardingComplete: true,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">レッスン管理</h1>
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-6 text-slate-600">
        ここにレッスンの作成・編集・公開・並べ替え・ソフト削除UIを実装します（プレースホルダ）。
      </div>
    </div>
  );
}
