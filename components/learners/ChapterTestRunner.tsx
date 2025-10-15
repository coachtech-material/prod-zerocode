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
    return <div className="text-sm text-[color:var(--muted)]">このチャプターに公開中の確認テストはありません。</div>;
  }

  if (!current) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center">
        <div className="text-lg font-semibold text-[color:var(--text)]">チャプター完了！</div>
        <div className="mt-1 text-sm text-[color:var(--muted)]">お疲れさまでした。</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[color:var(--muted)]">{idx + 1} / {list.length}</div>
        <div className="max-w-[60ch] truncate text-sm font-medium text-[color:var(--text)]">{current.title || '無題のテスト'}</div>
      </div>
      <section className="surface-card rounded-2xl p-3">
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
            className="rounded-xl bg-[color:var(--brand)]/24 px-4 py-2 text-[color:var(--text)] font-semibold focus-ring hover:bg-[color:var(--brand)]/30"
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
            className="rounded-xl bg-[color:var(--brand)]/20 px-4 py-2 text-[color:var(--text)] focus-ring hover:bg-[color:var(--brand)]/28"
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
