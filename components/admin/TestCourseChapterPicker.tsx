"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Course = { id: string; title: string };
type Chapter = { id: string; title: string };

export default function TestCourseChapterPicker({
  courses,
  defaultCourseId,
  defaultChapterId,
}: {
  courses: Course[];
  defaultCourseId?: string | null;
  defaultChapterId?: string | null;
}) {
  const [courseId, setCourseId] = useState<string>(defaultCourseId || '');
  const [chapterId, setChapterId] = useState<string>(defaultChapterId || '');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadChapters(cid: string) {
      if (!cid) { setChapters([]); setChapterId(''); return; }
      try {
        setLoading(true);
        const supabase = createClient();
        const { data } = await supabase
          .from('chapters')
          .select('id,title')
          .eq('course_id', cid)
          .is('deleted_at', null)
          .order('chapter_sort_key', { ascending: true });
        if (!ignore) setChapters((data as any[])?.map((r) => ({ id: r.id, title: r.title })) || []);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadChapters(courseId);
    return () => { ignore = true; };
  }, [courseId]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="grid gap-1">
        <span className="text-slate-600">コース</span>
        <select
          name="course_id"
          value={courseId}
          onChange={(e)=>{ setCourseId(e.target.value); setChapterId(''); }}
          className="rounded-lg bg-brand-sky/10 px-3 py-2 focus-ring"
        >
          <option value="">（未選択）</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-slate-600">チャプター</span>
        <select
          name="chapter_id"
          value={chapterId}
          onChange={(e)=>setChapterId(e.target.value)}
          disabled={!courseId || loading}
          className="rounded-lg bg-brand-sky/10 px-3 py-2 focus-ring disabled:opacity-60"
        >
          <option value="">（未選択）</option>
          {chapters.map((ch) => (
            <option key={ch.id} value={ch.id}>{ch.title}</option>
          ))}
        </select>
        <span className="text-[11px] text-slate-500">コース選択で候補が更新されます。</span>
      </label>
    </div>
  );
}

