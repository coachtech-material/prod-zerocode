import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const course_id = String(body?.course_id || '').trim();
    const chapter_id = body?.chapter_id ? String(body.chapter_id).trim() : null;
    if (!course_id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || !['staff','admin'].includes(prof.role as string)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const insert = {
      title: '',
      course_id,
      chapter_id: chapter_id || null,
      type: 'cli',
      description_md: '',
      time_limit_sec: 60,
      pass_threshold: 80,
      status: 'draft',
      spec_yaml: null as any,
      mode: null as any,
      created_by: user.id,
    };
    const { data, error } = await supabase.from('tests').insert(insert).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'failed' }, { status: 500 });
  }
}

