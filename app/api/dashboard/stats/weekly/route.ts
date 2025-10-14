import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  formatMonthBounds,
  parseMonthParam,
  totalDaysInMonth,
} from '@/lib/dashboard/date';

function formatLabel(month: number, startDay: number, endDay: number) {
  return `${month}/${startDay}–${month}/${endDay}`;
}

function formatDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

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
    const daysInMonth = totalDaysInMonth(year, month);

    const { data, error } = await supabase
      .from('daily_reports')
      .select('report_date, total_minutes')
      .eq('user_id', user.id)
      .gte('report_date', start)
      .lt('report_date', next);
    if (error) throw error;

    const buckets = new Map<
      number,
      {
        reportCount: number;
        totalMinutes: number;
      }
    >();

    data?.forEach((item) => {
      const date = item.report_date as string;
      const day = Number(date.slice(8, 10));
      if (!Number.isFinite(day)) return;
      const bucketIndex = Math.floor((day - 1) / 7);
      const bucket = buckets.get(bucketIndex) || {
        reportCount: 0,
        totalMinutes: 0,
      };
      bucket.reportCount += 1;
      bucket.totalMinutes += item.total_minutes ?? 0;
      buckets.set(bucketIndex, bucket);
    });

    const result = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([index, value]) => {
        const startDay = index * 7 + 1;
        const endDay = Math.min(startDay + 6, daysInMonth);
        return {
          weekLabel: formatLabel(month, startDay, endDay),
          startDate: formatDate(year, month, startDay),
          endDate: formatDate(year, month, endDay),
          reportCount: value.reportCount,
          totalMinutes: value.totalMinutes,
        };
      });

    return NextResponse.json({ weeks: result });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const status = message === 'invalid_month' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
