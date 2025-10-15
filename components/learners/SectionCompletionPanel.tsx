"use client";

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { markSectionCompleted } from '@/app/(shell)/courses/[courseId]/sections/[sectionId]/actions';
import { SECTION_COMPLETED_EVENT } from '@/lib/learners/events';
import { useScrollLock } from '@/hooks/useScrollLock';

type NavItem = { id: string; title: string } | null;

type SectionCompletionPanelProps = {
  courseId: string;
  sectionId: string;
  initialCompleted: boolean;
  prev: NavItem;
  next: NavItem;
};

export default function SectionCompletionPanel({
  courseId,
  sectionId,
  initialCompleted,
  prev,
  next,
}: SectionCompletionPanelProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [showModal, setShowModal] = useState(false);
  const [modalStatus, setModalStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useScrollLock(showModal);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCompleted(initialCompleted);
  }, [initialCompleted]);

  useEffect(() => {
    if (completed) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sectionId?: string }>).detail;
      if (detail?.sectionId === sectionId) {
        setCompleted(true);
      }
    };
    window.addEventListener(SECTION_COMPLETED_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(SECTION_COMPLETED_EVENT, handler as EventListener);
    };
  }, [completed, sectionId]);

  const handleMarkComplete = useCallback(() => {
    setError(null);
    setModalStatus('loading');
    setShowModal(true);

    startTransition(async () => {
      try {
        const result = await markSectionCompleted(courseId, sectionId);
        if (!result?.success) {
          throw new Error(result?.message || '更新に失敗しました');
        }
        setCompleted(true);
        setModalStatus('success');
        window.dispatchEvent(new CustomEvent(SECTION_COMPLETED_EVENT, { detail: { sectionId } }));
      } catch (err: any) {
        setShowModal(false);
        setModalStatus('idle');
        setError(err?.message ?? '完了処理に失敗しました');
      }
    });
  }, [courseId, sectionId, startTransition]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalStatus('idle');
  }, []);

  return (
    <>
      {!completed ? (
        <div className="mt-10 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleMarkComplete}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-2xl bg-[color:var(--brand-strong)] px-6 py-3 text-base font-semibold text-white shadow-[var(--shadow-1)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? '処理中…' : 'ページを読了しました！'}
          </button>
          {error ? <p className="text-sm text-[color:var(--danger)]">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {prev ? (
            <Link
              href={`/courses/${courseId}/sections/${prev.id}`}
              className="rounded-2xl bg-[color:var(--brand)]/18 px-4 py-2.5 text-base font-medium text-[color:var(--text)] focus-ring hover:bg-[color:var(--brand)]/24"
            >
              ← 前へ: {prev.title}
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={`/courses/${courseId}/sections/${next.id}`}
              className="rounded-2xl bg-[color:var(--brand)]/24 px-4 py-2.5 text-base font-semibold text-[color:var(--text)] focus-ring hover:bg-[color:var(--brand)]/32"
            >
              次へ: {next.title} →
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>
      )}

      {showModal && mounted
        ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--overlay)] px-4">
            <div className="surface-menu relative w-full max-w-md rounded-2xl p-6">
              <button
                type="button"
                onClick={modalStatus === 'loading' ? undefined : closeModal}
                disabled={modalStatus === 'loading'}
                className="absolute right-3 top-3 text-[color:var(--muted)] transition hover:text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="閉じる"
                >
                  ×
                </button>
                <div className="space-y-4">
                  {modalStatus === 'loading' ? (
                    <div className="space-y-3 text-center">
                      <h3 className="text-lg font-semibold text-[color:var(--text)]">完了処理中です…</h3>
                      <p className="text-sm text-[color:var(--muted)]">このままお待ちください。</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-[color:var(--text)]">お疲れ様でした 🎉</h3>
                        <p className="mt-2 text-sm text-[color:var(--muted)]">
                          この教材を読了しました。次のステップに進むか、前の教材を復習しましょう。
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {prev ? (
                          <Link
                            href={`/courses/${courseId}/sections/${prev.id}`}
                            className="rounded-xl border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--brand)]/15"
                            onClick={closeModal}
                          >
                            ← 前の教材に戻る
                          </Link>
                        ) : (
                          <div className="hidden sm:block" />
                        )}
                        {next ? (
                          <Link
                            href={`/courses/${courseId}/sections/${next.id}`}
                            className="rounded-xl bg-[color:var(--brand)]/24 px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--brand)]/30"
                            onClick={closeModal}
                          >
                            次の教材に進む →
                          </Link>
                        ) : (
                          <div className="hidden sm:block" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={closeModal}
                        className="w-full rounded-xl border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--muted)] transition hover:bg-[color:var(--brand)]/12"
                      >
                        今は閉じる
                      </button>
                    </>
                  )}
                </div>
              </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}
