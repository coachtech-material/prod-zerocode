"use client";

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SectionToc from '@/components/learners/SectionToc';

type Chapter = { id: string; title: string; chapter_sort_key: number };
type Section = { id: string; title: string; section_sort_key: number; is_completed?: boolean };

type Props = {
  chapters: Chapter[];
  sectionsByChapter: Record<string, Section[]>;
  courseId: string;
  currentSectionId: string;
  completedSectionIds?: string[];
};

export default function SectionTocMobileDrawer({
  chapters,
  sectionsByChapter,
  courseId,
  currentSectionId,
  completedSectionIds,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)] px-4 py-3 text-sm font-semibold text-[color:var(--text)] shadow-[var(--shadow-1)] transition hover:border-[color:var(--brand)]/60 focus-ring"
      >
        <span>コース目次を{open ? '閉じる' : '表示'}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="mt-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)]/85 p-3 shadow-[var(--shadow-1)]">
          <SectionToc
            chapters={chapters}
            sectionsByChapter={sectionsByChapter}
            courseId={courseId}
            currentSectionId={currentSectionId}
            completedSectionIds={completedSectionIds}
            className="space-y-2"
          />
        </div>
      )}
    </div>
  );
}
