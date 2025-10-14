import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const spec = typeof body?.spec === 'string' ? body.spec : JSON.stringify(body?.spec || {});
    if (!id) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!prof || !['staff','admin'].includes(prof.role as string)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { error } = await supabase.from('tests').update({ spec_yaml: spec }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', message: e?.message || 'failed' }, { status: 500 });
  }
}

