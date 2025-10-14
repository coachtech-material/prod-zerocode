"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { SECTION_COMPLETED_EVENT } from '@/lib/learners/events';

type LessonHeaderProps = {
  courseId: string;
  sectionId: string;
  title: string;
  durationMin: number | null;
  initialCompleted: boolean;
};

export default function LessonHeader({
  courseId,
  sectionId,
  title,
  durationMin,
  initialCompleted,
}: LessonHeaderProps) {
  const [completed, setCompleted] = useState(initialCompleted);

  useEffect(() => {
    setCompleted(initialCompleted);
  }, [initialCompleted]);

  useEffect(() => {
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
  }, [sectionId]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {completed ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              学習済み
            </span>
          ) : null}
        </div>
        <div className="text-sm text-slate-500">所要時間: {durationMin || 0} 分</div>
      </div>
      <div className="flex items-start justify-end lg:w-72 xl:w-80 lg:pl-4 xl:pl-6">
        <Link
          href={`/courses/${courseId}`}
          className="hidden rounded-xl bg-brand-yellow px-3 py-2 text-sm text-brand font-medium focus-ring hover:bg-brand-yellow/90 lg:inline-flex"
        >
          ← コースに戻る
        </Link>
      </div>
    </div>
  );
}

