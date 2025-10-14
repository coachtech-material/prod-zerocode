import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatMonthBounds, parseMonthParam } from '@/lib/dashboard/date';

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month');
    const { year, month } = parseMonthParam(monthParam ?? undefined);
    const { start, next } = formatMonthBounds(year, month);

    const [{ data, error }, { data: progressData, error: progressError }] = await Promise.all([
      supabase
      .from('daily_reports')
      .select('total_minutes')
      .eq('user_id', user.id)
      .gte('report_date', start)
      .lt('report_date', next),
      supabase.rpc('dashboard_progress_counts'),
    ]);
    if (error) throw error;
    if (progressError) throw progressError;

    const totalMinutes =
      data?.reduce((acc, item) => acc + (item.total_minutes ?? 0), 0) ?? 0;
    const progressCounts = Array.isArray(progressData) ? progressData[0] : null;
    const completedSections = Number(progressCounts?.completed_sections ?? 0);
    const totalSections = Number(progressCounts?.total_sections ?? 0);
    const passedTests = Number(progressCounts?.passed_tests ?? 0);
    const totalTests = Number(progressCounts?.total_tests ?? 0);
    return NextResponse.json({
      reportCount: data?.length ?? 0,
      totalMinutes,
      completedSectionCount: completedSections,
      totalSectionCount: totalSections,
      passedTestCount: passedTests,
      totalTestCount: totalTests,
    });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const status = message === 'invalid_month' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
