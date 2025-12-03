"use client";

import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { reorderCourseStructure, setChapterStatus, setSectionStatus } from '@/app/(shell)/admin/courses/actions';

type Chapter = {
  id: string;
  title: string;
  status: 'draft' | 'published';
  chapter_sort_key: number;
};

type Section = {
  id: string;
  title: string;
  status: 'draft' | 'published';
  section_sort_key: number;
  duration_min: number | null;
  chapter_id: string;
};

type ChapterNode = Chapter & {
  sections: Section[];
};

type DragData =
  | { type: 'chapter'; chapterId: string }
  | { type: 'section'; sectionId: string; chapterId: string }
  | { type: 'chapter-drop'; chapterId: string }
  | { type: 'section-drop'; chapterId: string; index: number };

const collapseStorageKey = (courseId: string) => `course-structure:${courseId}:collapsed`;

const statusBadge = (status: string) =>
  status === 'published'
    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
    : 'border-white/20 bg-white/5 text-[color:var(--muted)]';

function buildStructure(chapters: Chapter[], sections: Section[]): ChapterNode[] {
  const map = new Map<string, Section[]>();
  sections.forEach((section) => {
    if (!section.chapter_id) return;
    if (!map.has(section.chapter_id)) map.set(section.chapter_id, []);
    map.get(section.chapter_id)!.push({ ...section });
  });
  for (const [, items] of map) {
    items.sort((a, b) => (a.section_sort_key ?? 0) - (b.section_sort_key ?? 0));
  }
  return chapters
    .slice()
    .sort((a, b) => (a.chapter_sort_key ?? 0) - (b.chapter_sort_key ?? 0))
    .map((chapter) => ({
      ...chapter,
      sections: map.get(chapter.id)?.map((section) => ({ ...section })) ?? [],
    }));
}

function cloneStructure(nodes: ChapterNode[]): ChapterNode[] {
  return nodes.map((chapter) => ({
    ...chapter,
    sections: chapter.sections.map((section) => ({ ...section })),
  }));
}

function structuresEqual(a: ChapterNode[], b: ChapterNode[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
    if (a[i].sections.length !== b[i].sections.length) return false;
    for (let j = 0; j < a[i].sections.length; j++) {
      if (a[i].sections[j].id !== b[i].sections[j].id) return false;
    }
  }
  return true;
}

function findSectionLocation(nodes: ChapterNode[], sectionId: string) {
  for (let chapterIndex = 0; chapterIndex < nodes.length; chapterIndex++) {
    const sectionIndex = nodes[chapterIndex].sections.findIndex((section) => section.id === sectionId);
    if (sectionIndex !== -1) {
      return { chapterIndex, sectionIndex };
    }
  }
  return null;
}

function ChapterDropZone({ chapterId }: { chapterId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `chapter-drop-${chapterId}`,
    data: { type: 'chapter-drop', chapterId },
  });
  return (
    <div
      ref={setNodeRef}
      className={[
        'mt-3 flex h-10 items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-[color:var(--muted)] transition',
        isOver ? 'border-brand bg-brand/10 text-brand' : '',
      ].join(' ')}
    >
      ここにテストを移動
    </div>
  );
}

function SectionDropZone({ chapterId, index }: { chapterId: string; index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${chapterId}-${index}`,
    data: { type: 'section-drop', chapterId, index },
  });
  return (
    <div
      ref={setNodeRef}
      className={[
        'my-1 flex h-8 items-center justify-center rounded-xl border border-dashed border-white/15 text-[11px] text-[color:var(--muted)] transition',
        isOver ? 'border-brand bg-brand/10 text-brand' : '',
      ].join(' ')}
    >
      ここに挿入
    </div>
  );
}

function ChapterCard({
  chapter,
  collapsed,
  toggle,
  onToggleStatus,
  statusPending,
  children,
}: {
  chapter: ChapterNode;
  collapsed: boolean;
  toggle: () => void;
  onToggleStatus: (nextStatus: 'draft' | 'published') => void;
  statusPending: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `chapter-${chapter.id}`,
    data: { type: 'chapter', chapterId: chapter.id },
  });
  const isPublished = chapter.status === 'published';
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_15px_35px_rgba(0,0,0,0.35)] transition',
        isDragging ? 'opacity-60 ring-1 ring-brand/40' : '',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--text)] transition hover:bg-white/10 focus-ring"
          aria-label={collapsed ? 'チャプターを展開' : 'チャプターを折りたたむ'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[color:var(--text)] transition hover:bg-white/10 focus-ring"
          aria-label="チャプターの並び替えを開始"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1 min-w-[200px] space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-[color:var(--text)]">{chapter.title}</span>
            <button
              type="button"
              onClick={() => onToggleStatus(isPublished ? 'draft' : 'published')}
              disabled={statusPending}
              aria-pressed={isPublished}
              className={[
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-4 focus-ring transition',
                statusBadge(chapter.status),
                statusPending ? 'opacity-60' : '',
              ].join(' ')}
            >
              <span>{isPublished ? '公開中' : '非公開'}</span>
              <span className="text-[9px] text-white/80">
                {statusPending ? '更新中…' : '切り替え'}
              </span>
            </button>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[color:var(--muted)]">
              #{chapter.chapter_sort_key}
            </span>
          </div>
          <p className="text-xs text-[color:var(--muted)]">テスト {chapter.sections.length} 件</p>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('add-content:open', { detail: { chapterId: chapter.id } }))}
          className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] transition hover:bg-white/10 focus-ring"
        >
          ＋テストを追加
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}

function SectionRow({
  section,
  courseId,
  onToggleStatus,
  statusPending,
}: {
  section: Section;
  courseId: string;
  onToggleStatus: (nextStatus: 'draft' | 'published') => void;
  statusPending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `section-${section.id}`,
    data: { type: 'section', sectionId: section.id, chapterId: section.chapter_id },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isPublished = section.status === 'published';
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition',
        isDragging ? 'opacity-60 ring-1 ring-brand/40' : '',
      ].join(' ')}
    >
      <button
        type="button"
        className="mt-1 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[color:var(--text)] transition hover:bg-white/10 focus-ring"
        aria-label="テストの並び替えを開始"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/courses/${courseId}/sections/${section.id}`}
            className="text-sm font-semibold text-[color:var(--text)] underline decoration-transparent transition hover:decoration-brand"
          >
            {section.title}
          </Link>
          <button
            type="button"
            onClick={() => onToggleStatus(isPublished ? 'draft' : 'published')}
            disabled={statusPending}
            aria-pressed={isPublished}
            className={[
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-4 focus-ring transition',
              statusBadge(section.status),
              statusPending ? 'opacity-60' : '',
            ].join(' ')}
          >
            <span>{isPublished ? '公開中' : '下書き'}</span>
            <span className="text-[9px] text-white/80">{statusPending ? '更新中…' : '切り替え'}</span>
          </button>
        </div>
        <div className="text-xs text-[color:var(--muted)]">目安: {section.duration_min || 0} 分</div>
      </div>
    </div>
  );
}

export default function ContentTable({
  chapters,
  sections,
  courseId,
}: {
  chapters: Chapter[];
  sections: Section[];
  courseId: string;
}) {
  const computedStructure = useMemo(() => buildStructure(chapters, sections), [chapters, sections]);
  const [structure, setStructure] = useState<ChapterNode[]>(computedStructure);
  const [isDragProcess, setIsDragProcess] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();
  const [isStatusUpdating, startStatusTransition] = useTransition();
  const [pendingChapterStatusId, setPendingChapterStatusId] = useState<string | null>(null);
  const [pendingSectionStatusId, setPendingSectionStatusId] = useState<string | null>(null);
  const pendingStructureRef = useRef<ChapterNode[] | null>(null);

  useEffect(() => {
    if (isDragProcess) return;
    setStructure((prev) => (structuresEqual(prev, computedStructure) ? prev : computedStructure));
  }, [computedStructure, isDragProcess]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(collapseStorageKey(courseId));
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [courseId]);

  const saveCollapsed = useCallback(
    (next: Record<string, boolean>) => {
      setCollapsed(next);
      try {
        localStorage.setItem(collapseStorageKey(courseId), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [courseId, startStatusTransition]
  );

  const toggleChapter = useCallback(
    (id: string) => {
      saveCollapsed({ ...collapsed, [id]: !collapsed[id] });
    },
    [collapsed, saveCollapsed]
  );

  const ensureExpanded = useCallback(
    (chapterId: string) => {
      if (collapsed[chapterId]) {
        saveCollapsed({ ...collapsed, [chapterId]: false });
      }
    },
    [collapsed, saveCollapsed]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const persistStructure = useCallback(
    (nextStructure: ChapterNode[]) => {
      const payload = {
        chapterOrder: nextStructure.map((chapter, index) => ({
          id: chapter.id,
          order: index + 1,
        })),
        sectionOrder: nextStructure.flatMap((chapter) =>
          chapter.sections.map((section, index) => ({
            id: section.id,
            chapterId: chapter.id,
            order: index + 1,
          }))
        ),
      };
      setSaveMessage('並び順を更新しています…');
      startTransition(async () => {
        try {
          await reorderCourseStructure(courseId, payload);
          setSaveMessage('並び順を保存しました');
          setTimeout(() => setSaveMessage(null), 1800);
        } catch (error) {
          console.error(error);
          setSaveMessage('並び順の保存に失敗しました');
        }
      });
    },
    [courseId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data.current?.type === 'section') {
      const chapterId = event.active.data.current.chapterId as string | undefined;
      if (chapterId) ensureExpanded(chapterId);
    }
    setIsDragProcess(true);
  }, [ensureExpanded]);

  const moveChapter = useCallback((fromId: string, toId: string) => {
    setStructure((prev) => {
      const oldIndex = prev.findIndex((chapter) => chapter.id === fromId);
      const newIndex = prev.findIndex((chapter) => chapter.id === toId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      pendingStructureRef.current = next;
      return next;
    });
  }, []);

  const moveSection = useCallback(
    (sectionId: string, destinationChapterId: string, destinationIndex: number) => {
      setStructure((prev) => {
        const next = cloneStructure(prev);
        const sourceLocation = findSectionLocation(next, sectionId);
        const targetChapterIndex = next.findIndex((chapter) => chapter.id === destinationChapterId);
        if (!sourceLocation || targetChapterIndex === -1) return prev;
        const sourceChapter = next[sourceLocation.chapterIndex];
        const destinationChapter = next[targetChapterIndex];
        if (
          destinationChapter.id === sourceChapter.id &&
          (destinationIndex === sourceLocation.sectionIndex ||
            destinationIndex === sourceLocation.sectionIndex + 1)
        ) {
          return prev;
        }
        const [moved] = sourceChapter.sections.splice(sourceLocation.sectionIndex, 1);
        if (!moved) return prev;
        moved.chapter_id = destinationChapter.id;
        let insertIndex = destinationIndex;
        if (
          destinationChapter.id === sourceChapter.id &&
          insertIndex > sourceLocation.sectionIndex
        ) {
          insertIndex -= 1;
        }
        insertIndex = Math.max(0, Math.min(insertIndex, destinationChapter.sections.length));
        destinationChapter.sections.splice(insertIndex, 0, moved);
        pendingStructureRef.current = next;
        return next;
      });
    },
    []
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeData = active.data.current as DragData | undefined;
      const overData = over.data.current as DragData | undefined;
      if (!activeData || !overData) return;

      if (activeData.type === 'chapter') {
        if (overData.type === 'chapter' && activeData.chapterId !== overData.chapterId) {
          moveChapter(activeData.chapterId, overData.chapterId);
        }
        return;
      }

      if (activeData.type === 'section') {
        const activeSectionId = activeData.sectionId;
        if (overData.type === 'section-drop') {
          ensureExpanded(overData.chapterId);
          moveSection(activeSectionId, overData.chapterId, overData.index);
          return;
        }
        if (overData.type === 'section') {
          if (activeSectionId === overData.sectionId) return;
          const overLocation = findSectionLocation(structure, overData.sectionId);
          if (!overLocation) return;
          ensureExpanded(overData.chapterId);
          moveSection(activeSectionId, overData.chapterId, overLocation.sectionIndex);
          return;
        }
        if (overData.type === 'chapter' || overData.type === 'chapter-drop') {
          ensureExpanded(overData.chapterId);
          const targetChapter = structure.find((chapter) => chapter.id === overData.chapterId);
          const insertIndex = targetChapter ? targetChapter.sections.length : 0;
          moveSection(activeSectionId, overData.chapterId, insertIndex);
        }
      }
    },
    [ensureExpanded, moveChapter, moveSection, structure]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragProcess(false);
      if (pendingStructureRef.current) {
        persistStructure(pendingStructureRef.current);
        pendingStructureRef.current = null;
      }
    },
    [persistStructure]
  );

  const handleChapterStatusChange = useCallback(
    (chapterId: string, nextStatus: 'draft' | 'published') => {
      setPendingChapterStatusId(chapterId);
      setSaveMessage('公開設定を更新しています…');
      startStatusTransition(async () => {
        try {
          await setChapterStatus(courseId, chapterId, nextStatus);
          setStructure((prev) =>
            prev.map((chapter) => (chapter.id === chapterId ? { ...chapter, status: nextStatus } : chapter))
          );
          setSaveMessage('公開設定を更新しました');
          setTimeout(() => setSaveMessage(null), 1800);
        } catch (error) {
          console.error(error);
          setSaveMessage('公開設定の更新に失敗しました');
        } finally {
          setPendingChapterStatusId((current) => (current === chapterId ? null : current));
        }
      });
    },
    [courseId]
  );

  const handleSectionStatusChange = useCallback(
    (sectionId: string, nextStatus: 'draft' | 'published') => {
      setPendingSectionStatusId(sectionId);
      setSaveMessage('公開設定を更新しています…');
      startStatusTransition(async () => {
        try {
          await setSectionStatus(courseId, sectionId, nextStatus);
          setStructure((prev) =>
            prev.map((chapter) => ({
              ...chapter,
              sections: chapter.sections.map((section) =>
                section.id === sectionId ? { ...section, status: nextStatus } : section
              ),
            }))
          );
          setSaveMessage('公開設定を更新しました');
          setTimeout(() => setSaveMessage(null), 1800);
        } catch (error) {
          console.error(error);
          setSaveMessage('公開設定の更新に失敗しました');
        } finally {
          setPendingSectionStatusId((current) => (current === sectionId ? null : current));
        }
      });
    },
    [courseId]
  );

  const chapterIds = structure.map((chapter) => `chapter-${chapter.id}`);

  return (
    <div className="p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={chapterIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {structure.map((chapter) => {
              const sectionIds = chapter.sections.map((section) => `section-${section.id}`);
              return (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  collapsed={!!collapsed[chapter.id]}
                  toggle={() => toggleChapter(chapter.id)}
                  onToggleStatus={(status) => handleChapterStatusChange(chapter.id, status)}
                  statusPending={pendingChapterStatusId === chapter.id && isStatusUpdating}
                >
                  {!collapsed[chapter.id] && (
                    <div className="mt-4 space-y-3 border-l border-white/10 pl-4">
                      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                        <SectionDropZone chapterId={chapter.id} index={0} />
                        {chapter.sections.length === 0 && (
                          <div className="rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-sm text-[color:var(--muted)]">
                            テストがまだありません。ここにドラッグするか、追加ボタンを押してください。
                          </div>
                        )}
                        {chapter.sections.map((section, index) => (
                          <div key={section.id} className="space-y-1">
                            <SectionRow
                              section={section}
                              courseId={courseId}
                              onToggleStatus={(next) => handleSectionStatusChange(section.id, next)}
                              statusPending={pendingSectionStatusId === section.id && isStatusUpdating}
                            />
                            <SectionDropZone chapterId={chapter.id} index={index + 1} />
                          </div>
                        ))}
                      </SortableContext>
                      <ChapterDropZone chapterId={chapter.id} />
                    </div>
                  )}
                </ChapterCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <div className="mt-4 text-xs text-[color:var(--muted)]">
        {isSaving ? saveMessage : saveMessage || 'ドラッグ＆ドロップでチャプター／テストの並び順を変更できます。'}
      </div>
    </div>
  );
}
