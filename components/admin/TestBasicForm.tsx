"use client";
import { useMemo, useState } from 'react';

type Course = { id: string; title: string };
type Chapter = { id: string; title: string; course_id: string };

export default function TestBasicForm({
  action,
  test,
  courses,
  chapters,
}: {
  action: (formData: FormData) => any;
  test: { id: string; title: string | null; course_id: string | null; chapter_id: string | null; mode: string | null; status?: 'draft'|'published' };
  courses: Course[];
  chapters: Chapter[];
}) {
  const [title, setTitle] = useState<string>(test.title || '');
  const [courseId, setCourseId] = useState<string>(test.course_id || (courses[0]?.id || ''));
  const filteredChapters = useMemo(() => chapters.filter(ch => ch.course_id === courseId), [chapters, courseId]);
  const [chapterId, setChapterId] = useState<string>(test.chapter_id || '');
  const [mode, setMode] = useState<string>(test.mode || '');
  const [status, setStatus] = useState<'draft'|'published'>(test.status || 'draft');
  const dirty = (
    title !== (test.title || '') ||
    courseId !== (test.course_id || (courses[0]?.id || '')) ||
    (chapterId || '') !== (test.chapter_id || '') ||
    (mode || '') !== (test.mode || '') ||
    status !== (test.status || 'draft')
  );

  return (
    <form action={action} className="grid gap-3 max-w-xl">
      <input type="hidden" name="id" value={test.id} />

      <label className="grid gap-1">
        <span className="text-xs text-slate-500">テスト名</span>
        <input name="title" value={title} onChange={(e)=>setTitle(e.target.value)} required minLength={1} maxLength={100} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring" />
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-slate-500">コース</span>
        <select
          name="course_id"
          value={courseId}
          onChange={(e) => {
            const v = e.target.value;
            setCourseId(v);
            // reset chapter if it does not belong to selected course
            if (!chapters.find(ch => ch.id === chapterId && ch.course_id === v)) setChapterId('');
          }}
          className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring"
          required
        >
          {courses.map(c => (<option key={c.id} value={c.id}>{c.title || c.id}</option>))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-slate-500">チャプター（任意）</span>
        <select
          name="chapter_id"
          value={chapterId}
          onChange={(e)=>setChapterId(e.target.value)}
          className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring"
        >
          <option value="">（未選択：コース直下）</option>
          {filteredChapters.map(ch => (<option key={ch.id} value={ch.id}>{ch.title || ch.id}</option>))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-slate-500">テスト形態</span>
        <select name="mode" value={mode} onChange={(e)=>setMode(e.target.value)} required className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring">
          <option value="" disabled>選択してください</option>
          <option value="fill_blank">穴埋め</option>
          <option value="semantic_fill">言語化穴埋め</option>
          <option value="fix">修正</option>
          <option value="reorder">並べ替え</option>
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-xs text-slate-500">公開ステータス</span>
        <select name="status" value={status} onChange={(e)=>setStatus(e.target.value as any)} className="rounded-xl bg-brand-sky/10 px-3 py-2 focus-ring">
          <option value="published">公開</option>
          <option value="draft">非公開</option>
        </select>
      </label>

      <div className="pt-2">
        <button type="submit" className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring">保存</button>
        {dirty && (
          <span className="ml-3 text-xs text-red-600">未保存の変更があります</span>
        )}
      </div>
    </form>
  );
}
