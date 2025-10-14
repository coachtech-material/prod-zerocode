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

    const { data: reports, error: reportsError } = await supabase
      .from('daily_reports')
      .select('id')
      .eq('user_id', user.id)
      .gte('report_date', start)
      .lt('report_date', next);
    if (reportsError) throw reportsError;
    const reportIds = reports?.map((item) => item.id) ?? [];
    if (!reportIds.length) {
      return NextResponse.json({ categories: [] });
    }

    const { data: items, error: itemsError } = await supabase
      .from('daily_report_items')
      .select('category_id, category_name, minutes')
      .in('daily_report_id', reportIds);
    if (itemsError) throw itemsError;

    const totals = new Map<
      string,
      { categoryId: string | null; categoryName: string; minutes: number }
    >();
    let grandTotal = 0;

    items?.forEach((item) => {
      const name = item.category_name || '未分類';
      const key = `${item.category_id ?? 'null'}::${name.toLowerCase()}`;
      const record = totals.get(key) || {
        categoryId: item.category_id ?? null,
        categoryName: name,
        minutes: 0,
      };
      record.minutes += item.minutes ?? 0;
      totals.set(key, record);
      grandTotal += item.minutes ?? 0;
    });

    if (grandTotal <= 0) {
      return NextResponse.json({ categories: [] });
    }

    const result = Array.from(totals.values())
      .sort((a, b) => b.minutes - a.minutes || a.categoryName.localeCompare(b.categoryName))
      .map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        minutes: item.minutes,
        ratio: item.minutes / grandTotal,
      }));

    // ensure ratios sum to 1 with rounding adjustments
    let accumulated = 0;
    const adjusted = result.map((item, index) => {
      if (index === result.length - 1) {
        return {
          ...item,
          ratio: Math.max(0, 1 - accumulated),
        };
      }
      const rounded = Math.round(item.ratio * 1000) / 1000;
      accumulated += rounded;
      return { ...item, ratio: rounded };
    });

    return NextResponse.json({ categories: adjusted });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const status = message === 'invalid_month' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
