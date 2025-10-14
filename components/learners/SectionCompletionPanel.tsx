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
            className="inline-flex items-center justify-center rounded-2xl bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? '処理中…' : 'ページを読了しました！'}
          </button>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {prev ? (
            <Link
              href={`/courses/${courseId}/sections/${prev.id}`}
              className="rounded-2xl bg-brand-yellow px-4 py-2.5 text-base text-brand font-medium focus-ring hover:bg-brand-yellow/90"
            >
              ← 前へ: {prev.title}
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}
          {next ? (
            <Link
              href={`/courses/${courseId}/sections/${next.id}`}
              className="rounded-2xl bg-brand-yellow px-4 py-2.5 text-base text-brand font-semibold focus-ring hover:bg-brand-yellow/90"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <button
                type="button"
                onClick={modalStatus === 'loading' ? undefined : closeModal}
                disabled={modalStatus === 'loading'}
                className="absolute right-3 top-3 text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="閉じる"
                >
                  ×
                </button>
                <div className="space-y-4">
                  {modalStatus === 'loading' ? (
                    <div className="space-y-3 text-center">
                      <h3 className="text-lg font-semibold text-slate-900">完了処理中です…</h3>
                      <p className="text-sm text-slate-600">このままお待ちください。</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">お疲れ様でした 🎉</h3>
                        <p className="mt-2 text-sm text-slate-600">
                          この教材を読了しました。次のステップに進むか、前の教材を復習しましょう。
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {prev ? (
                          <Link
                            href={`/courses/${courseId}/sections/${prev.id}`}
                            className="rounded-xl border border-brand/20 px-4 py-2 text-sm font-medium text-brand transition hover:border-brand hover:bg-brand/10"
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
                            className="rounded-xl bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-yellow/90"
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
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-300"
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
