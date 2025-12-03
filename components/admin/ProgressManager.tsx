"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createProgressLimitAction,
  deleteProgressLimitAction,
  setInterviewTagAction,
} from '@/app/(shell)/admin/user/actions';
import { INTERVIEW_TAG_UPDATED_EVENT } from '@/components/admin/adminEvents';

type CourseRecord = { id: string; title: string };
type ChapterRecord = { id: string; title: string; course_id: string };
type SectionRecord = { id: string; title: string; course_id: string; chapter_id: string; section_sort_key: number | null };
type ProgressLimitView = {
  id: string;
  courseId: string;
  chapterId: string;
  sectionId: string;
  courseTitle: string;
  chapterTitle: string;
  sectionTitle: string;
  createdAt: string | null;
};
type BlockedUserView = {
  userId: string;
  name: string;
  email: string | null;
  courseTitle: string;
  chapterTitle: string;
  sectionTitle: string;
};

type Props = {
  courses: CourseRecord[];
  chapters: ChapterRecord[];
  sections: SectionRecord[];
  limits: ProgressLimitView[];
  blockedUsers: BlockedUserView[];
};

export default function ProgressManager({ courses, chapters, sections, limits, blockedUsers }: Props) {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<string>(courses[0]?.id ?? '');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionPending, startAction] = useTransition();
  const [hiddenBlocked, setHiddenBlocked] = useState<Record<string, boolean>>({});
  const visibleBlocked = useMemo(
    () => blockedUsers.filter((user) => !hiddenBlocked[user.userId]),
    [blockedUsers, hiddenBlocked]
  );
  useEffect(() => {
    const listener: EventListener = (event) => {
      const { detail } = event as CustomEvent<{ userId: string; completed: boolean }>;
      if (!detail) return;
      setHiddenBlocked((prev) => {
        const nextState = { ...prev };
        if (detail.completed) {
          nextState[detail.userId] = true;
        } else {
          delete nextState[detail.userId];
        }
        return nextState;
      });
    };
    window.addEventListener(INTERVIEW_TAG_UPDATED_EVENT, listener);
    return () => window.removeEventListener(INTERVIEW_TAG_UPDATED_EVENT, listener);
  }, []);

  const filteredChapters = useMemo(
    () => chapters.filter((chapter) => chapter.course_id === selectedCourse),
    [chapters, selectedCourse]
  );
  const filteredSections = useMemo(
    () => sections.filter((section) => section.chapter_id === selectedChapter),
    [sections, selectedChapter]
  );

  const handleCourseChange = (value: string) => {
    setSelectedCourse(value);
    setSelectedChapter('');
    setSelectedSection('');
  };

  const handleChapterChange = (value: string) => {
    setSelectedChapter(value);
    setSelectedSection('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    startAction(async () => {
      try {
        await createProgressLimitAction(formData);
        setMessage('進捗制限を追加しました。');
        setSelectedSection('');
      } catch (error: any) {
        setMessage(error?.message ?? '進捗制限の追加に失敗しました。');
      }
    });
  };

  const handleDelete = (limitId: string) => {
    setMessage(null);
    startAction(async () => {
      try {
        await deleteProgressLimitAction(limitId);
        setMessage('進捗制限を削除しました。');
      } catch (error: any) {
        setMessage(error?.message ?? '削除に失敗しました。');
      }
    });
  };

  const handleInterviewToggle = (userId: string, next: boolean) => {
    setMessage(null);
    const optimistic = next;
    if (optimistic) {
      setHiddenBlocked((prev) => ({ ...prev, [userId]: true }));
    }
    startAction(async () => {
      try {
        await setInterviewTagAction(userId, next);
        setMessage(next ? '中間面談タグを付与しました。' : '中間面談タグを解除しました。');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(INTERVIEW_TAG_UPDATED_EVENT, { detail: { userId, completed: next } }));
        }
        router.refresh();
      } catch (error: any) {
        setMessage(error?.message ?? '中間面談タグの更新に失敗しました。');
        if (optimistic) {
          setHiddenBlocked((prev) => {
            if (!prev[userId]) return prev;
            const nextState = { ...prev };
            delete nextState[userId];
            return nextState;
          });
        }
      }
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[color:var(--surface-1)] p-5 shadow-[0_15px_35px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-3">
          <h2 className="text-base font-semibold text-[color:var(--text)]">進捗管理</h2>
          <p className="text-xs text-[color:var(--muted)]">進捗制限に達した受講生は中間面談タグが付与されるまで先の教材を閲覧できません。</p>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-[color:var(--muted)]">
              コース
              <select
                name="course_id"
                value={selectedCourse}
                onChange={(event) => handleCourseChange(event.target.value)}
                required
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--text)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="" disabled>
                  選択してください
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[color:var(--muted)]">
              チャプター
              <select
                name="chapter_id"
                value={selectedChapter}
                onChange={(event) => handleChapterChange(event.target.value)}
                required
                disabled={!filteredChapters.length}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--text)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
              >
                <option value="" disabled>
                  選択してください
                </option>
                {filteredChapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[color:var(--muted)]">
              セクション
              <select
                name="section_id"
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
                required
                disabled={!filteredSections.length}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--text)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
              >
                <option value="" disabled>
                  選択してください
                </option>
                {filteredSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={actionPending}
                className="w-full rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionPending ? '保存中…' : '進捗制限を追加'}
              </button>
            </div>
          </form>
          {message && <p className="text-xs text-brand">{message}</p>}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[color:var(--text)]">設定済みの進捗制限</h3>
            {limits.length ? (
              <ul className="space-y-2">
                {limits.map((limit) => (
                  <li key={limit.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-[color:var(--text)] sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{limit.courseTitle}</p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {limit.chapterTitle} / {limit.sectionTitle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(limit.id)}
                      disabled={actionPending}
                      className="rounded-lg bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[color:var(--muted)]">まだ進捗制限は設定されていません。</p>
            )}
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <h3 className="text-base font-semibold text-[color:var(--text)]">中間面談が必要な受講生</h3>
          {visibleBlocked.length ? (
            <ul className="space-y-3">
              {visibleBlocked.map((user) => (
                <li key={user.userId} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-[color:var(--text)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-xs text-[color:var(--muted)]">{user.email || 'メール未設定'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInterviewToggle(user.userId, true)}
                      disabled={actionPending}
                      className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white shadow hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      面談実施済みにする
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    {user.courseTitle} / {user.chapterTitle} / {user.sectionTitle}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[color:var(--muted)]">ブロック中の受講生はいません。</p>
          )}
        </div>
      </div>
    </div>
  );
}
