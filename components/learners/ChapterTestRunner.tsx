"use client";
import { useMemo, useState } from 'react';
import StudentTestPreview from '@/components/admin/TestStudentPreview';

type TestRow = { id: string; title?: string | null; mode: string; spec_yaml?: string | null };

export default function ChapterTestRunner({ tests, startIndex = 0 }: { tests: TestRow[]; startIndex?: number }) {
  const list = useMemo(() => (tests || []).filter((t) => !!t && !!t.mode), [tests]);
  const [idx, setIdx] = useState(Math.min(Math.max(0, startIndex || 0), Math.max(0, list.length - 1)));
  const [lastOk, setLastOk] = useState<boolean>(false);
  const [lastScored, setLastScored] = useState<boolean>(false);
  const [attemptNonce, setAttemptNonce] = useState<number>(0);
  const current = list[idx];

  if (!list.length) {
    return <div className="text-sm text-slate-500">このチャプターに公開中の確認テストはありません。</div>;
  }

  if (!current) {
    return (
      <div className="rounded-2xl border border-brand-sky/20 bg-white p-6 text-center">
        <div className="text-lg font-semibold text-slate-800">チャプター完了！</div>
        <div className="mt-1 text-sm text-slate-600">お疲れさまでした。</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">{idx + 1} / {list.length}</div>
        <div className="text-sm font-medium text-slate-800 truncate max-w-[60ch]">{current.title || '無題のテスト'}</div>
      </div>
      <section className="rounded-2xl border border-brand-sky/20 bg-white p-3">
        <StudentTestPreview
          key={`${current.id}:${attemptNonce}`}
          mode={current.mode as any}
          initialSpec={current.spec_yaml}
          onScored={(ok) => {
            setLastScored(true);
            setLastOk(!!ok);
          }}
        />
      </section>
      {(lastScored && lastOk && (idx + 1 < list.length)) && (
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-brand-yellow px-4 py-2 text-brand font-semibold shadow-sm focus-ring hover:bg-brand-yellow/90"
            onClick={() => {
              setIdx((v) => (v + 1 < list.length ? v + 1 : list.length));
              setLastOk(false);
              setLastScored(false);
              setAttemptNonce(0);
            }}
          >次へ</button>
        </div>
      )}
      {(lastScored && !lastOk) && (
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-xl bg-brand-yellow/80 px-4 py-2 text-brand focus-ring hover:bg-brand-yellow"
            onClick={() => {
              setAttemptNonce((n) => n + 1); // remount preview to reset state
              setLastScored(false);
              setLastOk(false);
            }}
          >もう一度</button>
        </div>
      )}
    </div>
  );
}
