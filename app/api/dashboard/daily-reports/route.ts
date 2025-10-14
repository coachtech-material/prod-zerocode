import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  ensureDateString,
  formatMonthBounds,
  parseMonthParam,
} from '@/lib/dashboard/date';

type SaveItem = {
  id?: string;
  categoryId?: string | null;
  categoryName: string;
  minutes: number;
  note?: string | null;
  sortOrder?: number;
};

type SavePayload = {
  date: string;
  reflectionText?: string | null;
  items: SaveItem[];
};

function normalizeReflection(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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

    const { data, error } = await supabase
      .from('daily_reports')
      .select('id, report_date, total_minutes, reflection_text')
      .eq('user_id', user.id)
      .gte('report_date', start)
      .lt('report_date', next)
      .order('report_date', { ascending: true });
    if (error) {
      throw error;
    }

    const reports =
      data?.map((item) => ({
        id: item.id,
        date: item.report_date,
        totalMinutes: item.total_minutes ?? 0,
        hasReflection: Boolean(item.reflection_text),
      })) ?? [];

    return NextResponse.json({ reports });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const status = message === 'invalid_month' ? 400 : 500;
    return NextResponse.json({ error: 'failed', message }, { status });
  }
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
    const body = (await req.json()) as SavePayload;
    if (!body?.date) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }
    const reportDate = ensureDateString(body.date);
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ error: 'empty_items' }, { status: 400 });
    }

    const normalizedItems = items.map((item, idx) => {
      const name = (item.categoryName || '').trim();
      if (!name) {
        throw new Error('category_required');
      }
      const minutes = Number(item.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new Error('invalid_minutes');
      }
      return {
        categoryName: name,
        categoryId: item.categoryId ? String(item.categoryId) : null,
        minutes: Math.floor(minutes),
        note: item.note ? String(item.note).trim() : null,
        sortOrder:
          typeof item.sortOrder === 'number' ? item.sortOrder : idx * 10,
      };
    });

    const totalMinutes = normalizedItems.reduce(
      (acc, item) => acc + item.minutes,
      0,
    );
    if (totalMinutes <= 0) {
      throw new Error('total_minutes_zero');
    }

    const reflection = normalizeReflection(body.reflectionText);

    // categories lookup
    const categoriesToEnsure = Array.from(
      new Set(
        normalizedItems
          .filter((item) => !item.categoryId)
          .map((item) => item.categoryName.toLowerCase()),
      ),
    );
    const categoryLookup = new Map<string, { id: string; name: string }>();

    if (categoriesToEnsure.length > 0) {
      const { data: existingCategories, error: fetchCategoryError } =
        await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', user.id)
          .in(
            'name',
            normalizedItems
              .filter((item) => !item.categoryId)
              .map((item) => item.categoryName),
          );
      if (fetchCategoryError) throw fetchCategoryError;
      existingCategories?.forEach((cat) => {
        categoryLookup.set(cat.name.toLowerCase(), {
          id: cat.id,
          name: cat.name,
        });
      });

      const missingNames = normalizedItems
        .filter(
          (item) =>
            !item.categoryId &&
            !categoryLookup.has(item.categoryName.toLowerCase()),
        )
        .map((item) => item.categoryName);

      if (missingNames.length) {
        const uniqueMissing = Array.from(new Set(missingNames));
        const { data: inserted, error: insertError } = await supabase
          .from('categories')
          .insert(
            uniqueMissing.map((name) => ({
              user_id: user.id,
              name,
            })),
          )
          .select('id, name');
        if (insertError) throw insertError;
        inserted?.forEach((cat) =>
          categoryLookup.set(cat.name.toLowerCase(), {
            id: cat.id,
            name: cat.name,
          }),
        );
      }
    }

    const resolvedItems = normalizedItems.map((item) => {
      if (item.categoryId) {
        return item;
      }
      const lookup = categoryLookup.get(item.categoryName.toLowerCase());
      if (!lookup) {
        throw new Error('category_resolution_failed');
      }
      return { ...item, categoryId: lookup.id };
    });

    const { data: existingReport } = await supabase
      .from('daily_reports')
      .select('id')
      .eq('user_id', user.id)
      .eq('report_date', reportDate)
      .maybeSingle();

    let reportId = existingReport?.id;

    if (!reportId) {
      const { data: created, error: insertReportError } = await supabase
        .from('daily_reports')
        .insert({
          user_id: user.id,
          report_date: reportDate,
          reflection_text: reflection,
          total_minutes: totalMinutes,
        })
        .select('id')
        .single();
      if (insertReportError) throw insertReportError;
      reportId = created?.id;
    } else {
      const { error: updateReportError } = await supabase
        .from('daily_reports')
        .update({
          reflection_text: reflection,
          total_minutes: totalMinutes,
        })
        .eq('id', reportId);
      if (updateReportError) throw updateReportError;

      const { error: deleteItemsError } = await supabase
        .from('daily_report_items')
        .delete()
        .eq('daily_report_id', reportId);
      if (deleteItemsError) throw deleteItemsError;
    }

    if (!reportId) {
      throw new Error('failed_to_create_report');
    }

    const { error: insertItemsError } = await supabase
      .from('daily_report_items')
      .insert(
        resolvedItems.map((item) => ({
          daily_report_id: reportId,
          category_id: item.categoryId,
          category_name: item.categoryName,
          minutes: item.minutes,
          note: item.note,
          sort_order: item.sortOrder,
        })),
      );
    if (insertItemsError) throw insertItemsError;

    return NextResponse.json({
      ok: true,
      report: {
        id: reportId,
        date: reportDate,
        totalMinutes,
        hasReflection: Boolean(reflection),
      },
    });
  } catch (error: any) {
    const message = error?.message ?? 'failed';
    const statusCodes: Record<string, number> = {
      invalid_date: 400,
      empty_items: 400,
      category_required: 422,
      invalid_minutes: 422,
      total_minutes_zero: 422,
      category_resolution_failed: 422,
    };
    const status = statusCodes[message] ?? 500;
    return NextResponse.json({ error: message }, { status });
  }
}
