import { requireRole } from '@/lib/auth/requireRole';

export default async function LessonViewPage({ params }: { params: { lessonId: string } }) {
  await requireRole(['user']);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">レッスン受講</h1>
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-6 text-slate-600">
        受講用レッスン表示（ID: <code>{params.lessonId}</code>）。解錠済みのレッスンのみ本文を表示します（プレースホルダ）。
      </div>
    </div>
  );
}
