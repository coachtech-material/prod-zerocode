import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ interview_completed: false }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('interview_completed')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ interview_completed: false }, { status: 500 });
  }

  return NextResponse.json({ interview_completed: !!data.interview_completed });
}
