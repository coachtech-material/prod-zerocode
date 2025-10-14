import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, color')
    .eq('user_id', user.id)
    .order('name', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    categories:
      data?.map((item) => ({
        id: item.id,
        name: item.name,
        color: item.color,
      })) ?? [],
  });
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body?.name || '').trim();
    const color =
      typeof body?.color === 'string' && body.color.trim().length
        ? body.color.trim()
        : null;
    if (!name) {
      return NextResponse.json({ error: 'name_required' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return NextResponse.json(
        { error: 'duplicate', category: existing },
        { status: 409 },
      );
    }

    const { data: inserted, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name,
        color,
      })
      .select('id, name, color')
      .single();
    if (error) throw error;
    return NextResponse.json({ category: inserted }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'failed' }, { status: 500 });
  }
}
