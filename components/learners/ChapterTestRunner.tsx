"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import StudentTestPreview from '@/components/admin/TestStudentPreview';

type TestRow = { id: string; title?: string | null; mode: string; spec_yaml?: string | null };

type Props = {
  tests: TestRow[];
  startIndex?: number;
  chapterTitle?: string;
  nextChapter?: { id: string; title?: string | null } | null;
};

type TestStatus = 'not_attempted' | 'failed' | 'passed';

export default function ChapterTestRunner({ tests, startIndex = 0, chapterTitle, nextChapter }: Props) {
  const list = useMemo(() => (tests || []).filter((t) => !!t && !!t.mode), [tests]);
  const [idx, setIdx] = useState(Math.min(Math.max(0, startIndex || 0), Math.max(0, list.length - 1)));
  const [lastOk, setLastOk] = useState(false);
  const [lastScored, setLastScored] = useState(false);
  const [attemptNonce, setAttemptNonce] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, TestStatus>>({});
  const clampedIdx = Math.min(idx, list.length);
  const current = clampedIdx < list.length ? list[clampedIdx] : undefined;

  const markStatus = (testId: string, ok: boolean) => {
    setStatuses((prev) => ({ ...prev, [testId]: ok ? 'passed' : 'failed' }));
  };

  const persistResult = async (testId: string, ok: boolean) => {
    try {
      await fetch('/api/test-results', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ test_id: testId, is_passed: ok }),
      });
    } catch (error) {
      console.error('failed to record test result', error);
    }
  };

  const statusBadge = (status: TestStatus) => {
    if (status === 'passed') {
      return <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-100">合格</span>;
    }
    if (status === 'failed') {
      return <span className="rounded-full border border-rose-400/40 bg-rose-500/20 px-2 py-0.5 text-xs text-rose-100">不合格</span>;
    }
    return <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-xs text-white/70">未受験</span>;
  };

  if (!list.length) {
    return <div className="text-sm text-[color:var(--muted)]">このチャプターに公開中の確認テストはありません。</div>;
  }

  if (!current) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[color:var(--surface-1)]/80 p-8 text-center text-white shadow-[0_25px_55px_rgba(0,0,0,0.45)]">
        <p className="text-3xl font-bold">お疲れ様でした！</p>
        <p className="mt-4 text-xl font-semibold text-white/90">
          {chapterTitle || 'このチャプター'}の確認問題はすべて完了です🎉
        </p>
        <p className="mt-4 max-w-2xl text-sm text-white/80">
          また一歩エンジニアとしての実力が身につきましたね！ 引き続き学習頑張っていきましょう🔥
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {nextChapter ? (
            <Link
              href={`/test/comfirm/chapter/${nextChapter.id}`}
              className="rounded-2xl bg-brand-yellow px-6 py-3 text-base font-semibold text-brand focus-ring"
            >
              次のチャプターへ
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-2xl border border-white/20 px-6 py-3 text-base font-semibold text-white/60"
            >
              次のチャプターは準備中
            </button>
          )}
          <Link
            href="/test/comfirm"
            className="rounded-2xl border border-white/20 px-6 py-3 text-base font-semibold text-white focus-ring hover:bg-white/10"
          >
            教材一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const currentStatus = current ? statuses[current.id] ?? 'not_attempted' : 'not_attempted';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[color:var(--muted)]">{idx + 1} / {list.length}</div>
        <div className="flex items-center gap-3">
          {statusBadge(currentStatus)}
          <div className="max-w-[60ch] truncate text-sm font-medium text-[color:var(--text)]">{current.title || '無題のテスト'}</div>
        </div>
      </div>
      <section className="surface-card rounded-2xl p-3">
        <StudentTestPreview
          key={`${current.id}:${attemptNonce}`}
          mode={current.mode as any}
          initialSpec={current.spec_yaml}
          onScored={(ok) => {
            setLastScored(true);
            setLastOk(!!ok);
            markStatus(current.id, !!ok);
            persistResult(current.id, !!ok);
          }}
        />
      </section>
      {(lastScored && lastOk) && (
        <div className="flex justify-end">
          <button
            type="button"
            className={[
              'inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold focus-ring shadow-lg transition',
              clampedIdx + 1 < list.length
                ? 'bg-brand-yellow text-brand hover:bg-yellow-300'
                : 'bg-orange-500 text-white hover:bg-orange-400',
            ].join(' ')}
            onClick={() => {
              setIdx((v) => (v + 1 <= list.length ? v + 1 : list.length));
              setLastOk(false);
              setLastScored(false);
              setAttemptNonce(0);
            }}
          >
            {clampedIdx + 1 < list.length ? (
              <>
                <span>次の問題へ進む</span>
                <span aria-hidden className="text-[color:var(--text)]/70">→</span>
              </>
            ) : (
              <>
                <span>チャプター結果を確認</span>
                <span aria-hidden className="text-[color:var(--text)]/70">🎉</span>
              </>
            )}
          </button>
        </div>
      )}
      {(lastScored && !lastOk) && (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-brand-yellow/80 px-6 py-3 text-sm font-semibold text-brand focus-ring shadow-md transition hover:bg-brand-yellow"
            onClick={() => {
              setAttemptNonce((n) => n + 1);
              setLastScored(false);
              setLastOk(false);
            }}
          >
            <span>もう一度チャレンジする</span>
            <span aria-hidden className="text-brand/80">↻</span>
          </button>
        </div>
      )}
    </div>
  );
}
