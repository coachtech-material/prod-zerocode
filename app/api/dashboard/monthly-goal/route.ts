import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  formatMonthBounds,
  parseMonthParam,
  daysRemainingInMonth,
} from '@/lib/dashboard/date';

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new Error('text_required');
  }
  return trimmed;
}

function normalizeTargetMinutes(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error('invalid_target');
  }
  return Math.round(num);
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

    const [{ data: goalData, error: goalError }, { data: reports, error: reportsError }] =
      await Promise.all([
        supabase
          .from('monthly_goals')
          .select('id, text, target_minutes')
          .eq('user_id', user.id)
          .eq('year', year)
          .eq('month', month)
          .maybeSingle(),
        supabase
          .from('daily_reports')
          .select('total_minutes')
          .eq('user_id', user.id)
          .gte('report_date', start)
          .lt('report_date', next),
      ]);

    if (goalError) throw goalError;
    if (reportsError) throw reportsError;

    const achievedMinutes =
      reports?.reduce((acc, report) => acc + (report.total_minutes ?? 0), 0) ??
      0;

    if (!goalData) {
      return NextResponse.json({
        goal: null,
        achievedMinutes,
        remainingDays: daysRemainingInMonth(year, month),
      });
    }

    return NextResponse.json({
      goal: {
        id: goalData.id,
        text: goalData.text,
        targetMinutes: goalData.target_minutes,
        year,
        month,
      },
      achievedMinutes,
      remainingDays: daysRemainingInMonth(year, month),
    });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const status = message === 'invalid_month' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
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
    if (!monthParam) {
      return NextResponse.json({ error: 'invalid_month' }, { status: 400 });
    }
    const { year, month } = parseMonthParam(monthParam);

    const body = await req.json();
    const text = normalizeText(body?.text);
    const targetMinutes = normalizeTargetMinutes(body?.targetMinutes);

    const { data: existing, error: existingError } = await supabase
      .from('monthly_goals')
      .select('id')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('monthly_goals')
        .update({
          text,
          target_minutes: targetMinutes,
        })
        .eq('id', existing.id)
        .select('id, text, target_minutes')
        .single();
      if (updateError) throw updateError;
      return NextResponse.json({
        goal: {
          id: updated.id,
          text: updated.text,
          targetMinutes: updated.target_minutes,
          year,
          month,
        },
      });
    }

    const { data: created, error: insertError } = await supabase
      .from('monthly_goals')
      .insert({
        user_id: user.id,
        year,
        month,
        text,
        target_minutes: targetMinutes,
      })
      .select('id, text, target_minutes')
      .single();
    if (insertError) throw insertError;

    return NextResponse.json({
      goal: {
        id: created.id,
        text: created.text,
        targetMinutes: created.target_minutes,
        year,
        month,
      },
    });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const statusMap: Record<string, number> = {
      invalid_month: 400,
      text_required: 422,
      invalid_target: 422,
    };
    const status = statusMap[message] ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}
