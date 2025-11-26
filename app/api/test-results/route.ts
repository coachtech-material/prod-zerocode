import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const testId = String(body?.test_id || '').trim();
    const isPassed = Boolean(body?.is_passed);
    if (!testId) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const payload = {
      test_id: testId,
      user_id: user.id,
      is_passed: isPassed,
      updated_at: new Date().toISOString(),
    } as Record<string, any>;

    const { error } = await supabase
      .from('test_results')
      .upsert(payload, { onConflict: 'test_id,user_id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'server_error' }, { status: 500 });
  }
}
