import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? String(body.title).trim() : '';
    const course_id = String(body?.course_id || '').trim();
    const chapter_id = body?.chapter_id ? String(body.chapter_id).trim() : null;
    const mode = body?.mode ? String(body.mode) : null;
    if (!title || title.length < 1 || title.length > 100) return NextResponse.json({ error: 'invalid_title' }, { status: 400 });
    if (!course_id) return NextResponse.json({ error: 'invalid_course' }, { status: 400 });
    if (mode && !['fill_blank','semantic_fill','fix','reorder'].includes(mode)) return NextResponse.json({ error: 'invalid_mode' }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || !['staff','admin'].includes(prof.role as string)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const update: any = { title, course_id, chapter_id };
    if (mode) update.mode = mode;
    const { error } = await supabase.from('tests').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'failed' }, { status: 500 });
  }
}

