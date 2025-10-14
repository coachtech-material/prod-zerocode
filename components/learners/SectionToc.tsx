"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SECTION_COMPLETED_EVENT } from '@/lib/learners/events';

type Chapter = { id: string; title: string; chapter_sort_key: number };
type Section = { id: string; title: string; section_sort_key: number; is_completed?: boolean };

type SectionTocProps = {
  chapters: Chapter[];
  sectionsByChapter: Record<string, Section[]>;
  courseId: string;
  currentSectionId: string;
  completedSectionIds?: string[];
};

export default function SectionToc({
  chapters,
  sectionsByChapter,
  courseId,
  currentSectionId,
  completedSectionIds = [],
}: SectionTocProps) {
  const [completedSet, setCompletedSet] = useState<Set<string>>(() => new Set(completedSectionIds));

  const completedKey = useMemo(() => [...completedSectionIds].sort().join('|'), [completedSectionIds]);

  useEffect(() => {
    setCompletedSet(new Set(completedSectionIds));
  }, [completedKey, completedSectionIds]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sectionId?: string }>).detail;
      if (!detail?.sectionId) return;
      setCompletedSet((prev) => {
        const sectionId = detail.sectionId;
        if (!sectionId || prev.has(sectionId)) return prev;
        const next = new Set(prev);
        next.add(sectionId);
        return next;
      });
    };
    window.addEventListener(SECTION_COMPLETED_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(SECTION_COMPLETED_EVENT, handler as EventListener);
    };
  }, []);

  const completedLookup = useMemo(() => completedSet, [completedSet]);

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-brand/10 bg-white shadow-sm overflow-hidden">
        <div className="flex h-10 items-center px-3 text-base font-semibold text-slate-900 border-b border-brand-sky/15">
          コース目次
        </div>
        {chapters.map((ch, i) => (
          <div key={ch.id} className={i > 0 ? 'border-t border-brand-sky/15' : ''}>
            <div className="flex h-9 items-center px-3 text-sm font-medium text-slate-600">
              <span className="truncate">{ch.title}</span>
            </div>
            <ul className="px-3 pb-2">
              {(sectionsByChapter[ch.id] || []).map((s) => {
                const active = s.id === currentSectionId;
                const isCompleted = completedLookup.has(s.id) || s.is_completed;
                const label = isCompleted ? `✅ ${s.title}` : s.title;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/courses/${courseId}/sections/${s.id}`}
                      className={[
                        'flex h-9 items-center rounded-lg pl-6 pr-2 text-xs transition',
                        active
                          ? 'bg-brand-sky/25 text-brand'
                          : 'text-slate-700 hover:bg-brand-sky/20 hover:text-brand',
                      ].join(' ')}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span className="inline-block max-w-[18rem] truncate align-middle">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
