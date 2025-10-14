"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarRange, Loader2, Search, ArrowLeft } from 'lucide-react';
import type { DailyReportDetail } from '@/lib/dashboard/types';
import { fetchJson } from '@/lib/dashboard/client';
import { formatDisplayDate, formatDuration, pad } from '@/lib/dashboard/format';

const today = new Date();

function buildMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export default function ReportsScreen() {
  const [monthKey, setMonthKey] = useState(buildMonthKey(today));
  const [search, setSearch] = useState('');
  const [reports, setReports] = useState<DailyReportDetail[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchJson<{ reports: { date: string }[] }>(
        `/api/dashboard/daily-reports?month=${monthKey}`,
      );
      const dates = summary.reports?.map((report) => report.date) ?? [];
      const details = await Promise.all(
        dates.map((date) =>
          fetchJson<{ report: DailyReportDetail | null }>(
            `/api/dashboard/daily-reports/${date}`,
          ).catch(() => ({ report: null })),
        ),
      );
      const merged = details
        .map((item) => item.report)
        .filter((report): report is DailyReportDetail => Boolean(report))
        .sort((a, b) => (a.date > b.date ? -1 : 1));
      setReports(merged);
      if (!merged.length) {
        setSelectedDate(null);
      } else if (!merged.some((report) => report.date === selectedDate)) {
        setSelectedDate(merged[0].date);
      }
    } catch (err) {
      console.error(err);
      setError('日報の取得に失敗しました');
      setReports([]);
      setSelectedDate(null);
    } finally {
      setLoading(false);
    }
  }, [monthKey, selectedDate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const keywords = search
      .split(/\s+/)
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean);
    if (!keywords.length) return reports;
    return reports.filter((report) =>
      keywords.every((keyword) => {
        if (report.date.includes(keyword)) return true;
        if ((report.reflectionText ?? '').toLowerCase().includes(keyword)) return true;
        return report.items.some(
          (item) =>
            item.categoryName.toLowerCase().includes(keyword) ||
            (item.note ?? '').toLowerCase().includes(keyword),
        );
      }),
    );
  }, [reports, search]);

  const selectedReport = filteredReports.find((report) => report.date === selectedDate) ?? null;

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-800">日報管理</h1>
        <p className="text-sm text-slate-500">月ごとの日報を一覧で確認・編集できます。</p>
      </header>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500">月を選択</label>
            <div className="relative inline-flex items-center">
              <CalendarRange className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="month"
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value)}
                className="rounded-lg border border-slate-200 px-10 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500">検索</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="カテゴリ・内容・感想で検索"
                className="w-full rounded-lg border border-slate-200 px-10 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">日付</th>
                  <th className="px-4 py-3">学習時間</th>
                  <th className="px-4 py-3">カテゴリ / メモ</th>
                  <th className="px-4 py-3">感想</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      <Loader2 className="mr-2 inline-block h-5 w-5 animate-spin" /> 読み込み中…
                    </td>
                  </tr>
                ) : filteredReports.length ? (
                  filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className={`cursor-pointer transition ${
                        selectedDate === report.date ? 'bg-brand/10' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedDate(report.date)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {formatDisplayDate(report.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDuration(report.totalMinutes)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {report.items
                          .map((item) => `${item.categoryName}${item.note ? `：${item.note}` : ''}`)
                          .slice(0, 2)
                          .join(' / ')}
                        {report.items.length > 2 ? ' …' : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {report.reflectionText ? `${report.reflectionText.slice(0, 40)}…` : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      日報がありません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <aside className="min-h-[240px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {selectedReport ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">選択中の日報</p>
                    <h2 className="text-lg font-semibold text-slate-800">
                      {formatDisplayDate(selectedReport.date)}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-brand hover:text-brand"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> 戻る
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
                    <span>学習時間</span>
                    <span className="font-semibold text-slate-800">
                      {formatDuration(selectedReport.totalMinutes)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-500">カテゴリ</h3>
                    <div className="space-y-2">
                      {selectedReport.items.map((item) => (
                        <div
                          key={item.id || `${item.categoryName}-${item.sortOrder}`}
                          className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600"
                        >
                          <span className="font-semibold text-slate-700">
                            {item.categoryName}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            {formatDuration(item.minutes)}
                          </span>
                          {item.note && (
                            <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500">感想</h3>
                    <div className="mt-1 rounded-xl bg-white px-3 py-2 text-sm text-slate-600">
                      {selectedReport.reflectionText || '記録された感想はありません。'}
                    </div>
                  </div>
                  <a
                    href={`/dashboard?date=${selectedReport.date}`}
                    className="block rounded-lg bg-brand px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-brand/90"
                  >
                    ダッシュボードで編集 / 削除
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
                <p>左の一覧から日報を選択してください。</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
