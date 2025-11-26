"use client";

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { reorderTestsStructure, type TestReorderNode } from '@/app/(shell)/admin/test/comfirm/actions';

type Chapter = {
  id: string;
  title: string;
  status?: string | null;
  chapter_sort_key?: number | null;
};

type TestItem = {
  id: string;
  title: string;
  status?: string | null;
  mode?: string | null;
  chapter_id: string | null;
  test_sort_key?: number | null;
};

type ChapterNode = Chapter & {
  tests: TestItem[];
};

type DragData =
  | { type: 'chapter'; chapterId: string }
  | { type: 'test'; testId: string; chapterId: string }
  | { type: 'chapter-drop'; chapterId: string }
  | { type: 'test-drop'; chapterId: string; index: number };

const statusBadge = (status: string) =>
  status === 'published'
    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
    : 'border-white/20 bg-white/5 text-[color:var(--muted)]';

function modeLabel(mode?: string | null) {
  switch (mode) {
    case 'fill_blank':
      return '穴埋め';
    case 'semantic_fill':
      return '言語化穴埋め';
    case 'fix':
      return '修正';
    case 'reorder':
      return '並べ替え';
    default:
      return '未設定';
  }
}

const collapseStorageKey = (courseId: string) => `test-manager:${courseId}:collapsed`;

export default function TestManagementTable({
  courseId,
  courseTitle,
  chapters,
  tests,
}: {
  courseId: string;
  courseTitle: string;
  chapters: Chapter[];
  tests: TestItem[];
}) {
  const [structure, setStructure] = useState<ChapterNode[]>(() => buildStructure(chapters, tests));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const pendingStructureRef = useRef<ChapterNode[] | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    setStructure(buildStructure(chapters, tests));
  }, [chapters, tests]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(collapseStorageKey(courseId));
      if (raw) {
        setCollapsed(JSON.parse(raw));
      }
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
    [courseId]
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistStructure = useCallback(
    (nextStructure: ChapterNode[]) => {
      const payload: TestReorderNode[] = nextStructure.map((chapter, index) => ({
        chapterId: chapter.id,
        chapterOrder: index + 1,
        tests: chapter.tests.map((test, testIndex) => ({ id: test.id, order: testIndex + 1 })),
      }));

      setSaveMessage('並び順を更新しています…');
      startTransition(async () => {
        try {
          await reorderTestsStructure(courseId, payload);
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
    if (event.active.data.current?.type === 'test') {
      const chapterId = event.active.data.current.chapterId as string | undefined;
      if (chapterId) ensureExpanded(chapterId);
    }
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

  const moveTest = useCallback((testId: string, targetChapterId: string, targetIndex: number) => {
    setStructure((prev) => {
      const next = cloneStructure(prev);
      let sourceChapterIndex = -1;
      let sourceTestIndex = -1;
      next.forEach((chapter, index) => {
        const idx = chapter.tests.findIndex((test) => test.id === testId);
        if (idx !== -1) {
          sourceChapterIndex = index;
          sourceTestIndex = idx;
        }
      });
      if (sourceChapterIndex === -1 || sourceTestIndex === -1) return prev;
      const sourceChapter = next[sourceChapterIndex];
      const [moved] = sourceChapter.tests.splice(sourceTestIndex, 1);
      if (!moved) return prev;
      const destinationIndex = next.findIndex((chapter) => chapter.id === targetChapterId);
      if (destinationIndex === -1) return prev;
      const destinationChapter = next[destinationIndex];
      let insertIndex = targetIndex;
      if (destinationChapter.id === sourceChapter.id && insertIndex > sourceTestIndex) {
        insertIndex -= 1;
      }
      insertIndex = Math.max(0, Math.min(insertIndex, destinationChapter.tests.length));
      moved.chapter_id = destinationChapter.id;
      destinationChapter.tests.splice(insertIndex, 0, moved);
      pendingStructureRef.current = next;
      return next;
    });
  }, []);

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

      if (activeData.type === 'test') {
        if (overData.type === 'test-drop') {
          ensureExpanded(overData.chapterId);
          moveTest(activeData.testId, overData.chapterId, overData.index);
          return;
        }
        if (overData.type === 'test') {
          if (activeData.testId === overData.testId) return;
          ensureExpanded(overData.chapterId);
          const targetChapter = structure.find((chapter) => chapter.id === overData.chapterId);
          const idx = targetChapter ? targetChapter.tests.findIndex((test) => test.id === overData.testId) : 0;
          moveTest(activeData.testId, overData.chapterId, Math.max(0, idx));
          return;
        }
        if (overData.type === 'chapter' || overData.type === 'chapter-drop') {
          ensureExpanded(overData.chapterId);
          const targetChapter = structure.find((chapter) => chapter.id === overData.chapterId);
          const insertIndex = targetChapter ? targetChapter.tests.length : 0;
          moveTest(activeData.testId, overData.chapterId, insertIndex);
        }
      }
    },
    [ensureExpanded, moveChapter, moveTest, structure]
  );

  const handleDragEnd = useCallback(() => {
    if (pendingStructureRef.current) {
      persistStructure(pendingStructureRef.current);
      pendingStructureRef.current = null;
    }
  }, [persistStructure]);

  const totalTests = structure.reduce((sum, chapter) => sum + chapter.tests.length, 0);
  const chapterIds = structure.map((chapter) => `chapter-${chapter.id}`);

  const createTest = async (chapterId: string) => {
    try {
      const res = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, chapter_id: chapterId }),
      });
      const json = await res.json();
      if (res.ok && json?.id) {
        window.location.href = `/admin/test/comfirm/${json.id}?tab=basic`;
      } else {
        alert(json?.error || 'テストの作成に失敗しました');
      }
    } catch (error) {
      alert('テストの作成に失敗しました');
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-[color:var(--surface-1)] shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
      <div className="border-b border-white/5 px-4 py-3">
        <h3 className="text-lg font-semibold text-[color:var(--text)]">{courseTitle}</h3>
        <p className="text-xs text-[color:var(--muted)]">テスト数: {totalTests}</p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {structure.length === 0 ? (
          <div className="p-4 text-sm text-[color:var(--muted)]">チャプターがありません。先に作成してください。</div>
        ) : (
          <SortableContext items={chapterIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4 p-4">
              {structure.map((chapter) => {
                const testIds = chapter.tests.map((test) => `test-${test.id}`);
                return (
                  <ChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    collapsed={!!collapsed[chapter.id]}
                    toggle={() => toggleChapter(chapter.id)}
                    onAddTest={() => createTest(chapter.id)}
                  >
                    {!collapsed[chapter.id] && (
                      <div className="mt-4 space-y-3 border-l border-white/10 pl-4">
                        <SortableContext items={testIds} strategy={verticalListSortingStrategy}>
                          <TestDropZone chapterId={chapter.id} index={0} />
                          {chapter.tests.length === 0 && (
                            <div className="rounded-xl border border-dashed border-white/20 bg-white/5 px-3 py-2 text-sm text-[color:var(--muted)]">
                              テストがまだありません。
                            </div>
                          )}
                          {chapter.tests.map((test, index) => (
                            <div key={test.id} className="space-y-1">
                              <TestRow test={test} />
                              <TestDropZone chapterId={chapter.id} index={index + 1} />
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
        )}
      </DndContext>
      <div className="border-t border-white/5 px-4 py-2 text-xs text-[color:var(--muted)]">
        {isSaving ? saveMessage : saveMessage || 'ドラッグ＆ドロップでテストの並び順を変更できます。'}
      </div>
    </div>
  );
}

function ChapterDropZone({ chapterId }: { chapterId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `chapter-drop-${chapterId}`,
    data: { type: 'chapter-drop', chapterId } as DragData,
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

function TestDropZone({ chapterId, index }: { chapterId: string; index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `test-drop-${chapterId}-${index}`,
    data: { type: 'test-drop', chapterId, index } as DragData,
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
  onAddTest,
  children,
}: {
  chapter: ChapterNode;
  collapsed: boolean;
  toggle: () => void;
  onAddTest: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `chapter-${chapter.id}`,
    data: { type: 'chapter', chapterId: chapter.id } as DragData,
  });
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
            <span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4', statusBadge(chapter.status ?? 'draft')].join(' ')}>
              {chapter.status === 'published' ? '公開' : '非公開'}
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-[color:var(--muted)]">
              #{chapter.chapter_sort_key ?? 0}
            </span>
            <span className="text-xs text-[color:var(--muted)]">テスト {chapter.tests.length} 件</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddTest}
          className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-[color:var(--text)] transition hover:bg-white/10 focus-ring"
        >
          ＋テストを追加
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}

function TestRow({ test }: { test: TestItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `test-${test.id}`,
    data: { type: 'test', testId: test.id, chapterId: test.chapter_id ?? '' } as DragData,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
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
            href={`/admin/test/comfirm/${test.id}`}
            className="text-sm font-semibold text-[color:var(--text)] underline decoration-transparent transition hover:decoration-brand"
          >
            {test.title || '(無題)'}
          </Link>
          <span className="text-[11px] text-[color:var(--muted)]">{modeLabel(test.mode)}</span>
          <span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] leading-4', statusBadge(test.status ?? 'draft')].join(' ')}>
            {test.status === 'published' ? '公開' : '非公開'}
          </span>
        </div>
      </div>
    </div>
  );
}

function buildStructure(chapters: Chapter[], tests: TestItem[]): ChapterNode[] {
  const sortedChapters = [...chapters]
    .map((chapter) => ({
      ...chapter,
      chapter_sort_key: chapter.chapter_sort_key ?? 0,
      status: chapter.status ?? 'draft',
    }))
    .sort((a, b) => a.chapter_sort_key - b.chapter_sort_key);

  const sortedTests = [...tests]
    .filter((test) => !!test.chapter_id)
    .map((test) => ({
      ...test,
      test_sort_key: test.test_sort_key ?? 0,
      status: test.status ?? 'draft',
    }))
    .sort((a, b) => a.test_sort_key - b.test_sort_key);

  return sortedChapters.map((chapter) => ({
    ...chapter,
    tests: sortedTests.filter((test) => test.chapter_id === chapter.id),
  }));
}

function cloneStructure(nodes: ChapterNode[]): ChapterNode[] {
  return nodes.map((chapter) => ({
    ...chapter,
    tests: chapter.tests.map((test) => ({ ...test })),
  }));
}
