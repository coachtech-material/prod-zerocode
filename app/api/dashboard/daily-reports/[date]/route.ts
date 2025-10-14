import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureDateString } from '@/lib/dashboard/date';

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } },
) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const reportDate = ensureDateString(params.date);
    const { data: report, error } = await supabase
      .from('daily_reports')
      .select('id, report_date, total_minutes, reflection_text')
      .eq('user_id', user.id)
      .eq('report_date', reportDate)
      .maybeSingle();
    if (error) throw error;
    if (!report) {
      return NextResponse.json({ report: null });
    }

    const { data: items, error: itemsError } = await supabase
      .from('daily_report_items')
      .select('id, category_id, category_name, note, minutes, sort_order')
      .eq('daily_report_id', report.id)
      .order('sort_order', { ascending: true });
    if (itemsError) throw itemsError;

    return NextResponse.json({
      report: {
        id: report.id,
        date: report.report_date,
        totalMinutes: report.total_minutes ?? 0,
        reflectionText: report.reflection_text ?? '',
        items:
          items?.map((item) => ({
            id: item.id,
            categoryId: item.category_id,
            categoryName: item.category_name,
            minutes: item.minutes ?? 0,
            note: item.note ?? '',
            sortOrder: item.sort_order ?? 0,
          })) ?? [],
      },
    });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const status = message === 'invalid_date' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { date: string } },
) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const reportDate = ensureDateString(params.date);
    const { data: report, error } = await supabase
      .from('daily_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_date', reportDate)
      .maybeSingle();
    if (error) throw error;
    if (!report) {
      return NextResponse.json({ ok: true });
    }

    const { error: deleteItemsError } = await supabase
      .from('daily_report_items')
      .delete()
      .eq('daily_report_id', report.id);
    if (deleteItemsError) throw deleteItemsError;

    const { error: deleteReportError } = await supabase
      .from('daily_reports')
      .delete()
      .eq('id', report.id);
    if (deleteReportError) throw deleteReportError;

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const status = message === 'invalid_date' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
