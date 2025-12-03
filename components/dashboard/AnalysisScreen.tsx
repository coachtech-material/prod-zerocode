"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChapterTestProgress, DailyReportSummary, MonthlySummary } from '@/lib/dashboard/types';
import { fetchJson } from '@/lib/dashboard/client';
import { formatDateKey, formatDuration, formatProgressRatio, pad } from '@/lib/dashboard/format';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

const today = new Date();
const palette = ['#2563eb', '#f97316', '#10b981', '#f43f5e', '#8b5cf6', '#14b8a6', '#facc15'];

function buildMonthKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export default function AnalysisScreen() {
  const monthKey = useMemo(() => buildMonthKey(today), []);
  const [summary, setSummary] = useState<MonthlySummary>({
    reportCount: 0,
    totalMinutes: 0,
    completedSectionCount: 0,
    totalSectionCount: 0,
    passedTestCount: 0,
    totalTestCount: 0,
  });
  const [programStart, setProgramStart] = useState<Date | null>(null);
  const [dailyReports, setDailyReports] = useState<DailyReportSummary[]>([]);
  const [chapterTests, setChapterTests] = useState<ChapterTestProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, chapterRes] = await Promise.all([
        fetchJson<MonthlySummary>(`/api/dashboard/stats/monthly-summary?month=${monthKey}`),
        fetchJson<{ chapters: ChapterTestProgress[] }>('/api/dashboard/stats/test-progress'),
      ]);
      setSummary(summaryRes);
      setChapterTests(chapterRes.chapters ?? []);
    } catch (err) {
      console.error(err);
      setError('分析データの取得に失敗しました');
      setSummary({
        reportCount: 0,
        totalMinutes: 0,
        completedSectionCount: 0,
        totalSectionCount: 0,
        passedTestCount: 0,
        totalTestCount: 0,
      });
      setChapterTests([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (active) {
            setProgramStart(normalizeDate(new Date()));
          }
          return;
        }
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        const base = profile?.created_at ? new Date(profile.created_at) : new Date();
        if (active) {
          setProgramStart(normalizeDate(base));
        }
      } catch (err) {
        console.error('Failed to load account creation date', err);
        if (active) {
          setProgramStart(normalizeDate(new Date()));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!programStart) return;
    let cancelled = false;
    const start = normalizeDate(programStart);
    const rangeDates = Array.from({ length: 7 }).map((_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      return current;
    });
    const monthKeys = Array.from(new Set(rangeDates.map((date) => buildMonthKey(date))));
    (async () => {
      try {
        const responses = await Promise.all(
          monthKeys.map((month) =>
            fetchJson<{ reports: DailyReportSummary[] }>(
              `/api/dashboard/daily-reports?month=${month}`,
            ),
          ),
        );
        if (cancelled) return;
        const reportMap = new Map<string, DailyReportSummary>();
        responses.forEach((res) => {
          res.reports?.forEach((report) => {
            reportMap.set(report.date, report);
          });
        });
        const targetKeys = rangeDates.map((date) =>
          formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate()),
        );
        const trimmed: DailyReportSummary[] = [];
        targetKeys.forEach((key) => {
          const entry = reportMap.get(key);
          if (entry) trimmed.push(entry);
        });
        setDailyReports(trimmed);
      } catch (err) {
        console.error('Failed to load weekly reports', err);
        if (!cancelled) {
          setDailyReports([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [programStart]);

  const displayWeekStart = useMemo(
    () => (programStart ? normalizeDate(programStart) : normalizeDate(today)),
    [programStart],
  );

  const last7Days = useMemo(() => {
    const reportMap = new Map<string, DailyReportSummary>();
    dailyReports.forEach((report) => {
      reportMap.set(report.date, report);
    });

    return Array.from({ length: 7 }).map((_, index) => {
      const current = new Date(displayWeekStart);
      current.setDate(displayWeekStart.getDate() + index);
      const key = formatDateKey(current.getFullYear(), current.getMonth() + 1, current.getDate());
      const report = reportMap.get(key);
      return {
        key,
        date: current,
        label: `${current.getMonth() + 1}/${current.getDate()}`,
        totalMinutes: report?.totalMinutes ?? 0,
        hasReport: Boolean(report),
      };
    });
  }, [dailyReports, displayWeekStart]);

  const maxDailyMinutes = useMemo(() => {
    return Math.max(1, ...last7Days.map((day) => day.totalMinutes));
  }, [last7Days]);

  const pieStyles = useMemo(() => {
    const totalPassed = chapterTests.reduce((acc, item) => acc + item.passedTests, 0);
    if (!totalPassed) return 'conic-gradient(#e2e8f0 0deg 360deg)';
    let current = 0;
    const segments: string[] = [];
    chapterTests.forEach((item, index) => {
      if (!item.passedTests) return;
      const ratio = item.passedTests / totalPassed;
      const color = palette[index % palette.length];
      const start = current;
      const end = current + ratio * 360;
      segments.push(`${color} ${start}deg ${end}deg`);
      current = end;
    });
    if (current < 360) {
      segments.push(`#e2e8f0 ${current}deg 360deg`);
    }
    return `conic-gradient(${segments.join(', ')})`;
  }, [chapterTests]);

  const hasPassedTests = useMemo(
    () => chapterTests.some((chapter) => chapter.passedTests > 0),
    [chapterTests],
  );

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-800">分析レポート</h1>
        <p className="text-sm text-slate-500">直近1週間の学習状況と確認テストの進捗を振り返りましょう。</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 読み込み中…
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <p className="text-xs font-medium text-slate-500">日報投稿日数</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">{summary.reportCount}日</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <p className="text-xs font-medium text-slate-500">総合学習時間</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">{formatDuration(summary.totalMinutes)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <p className="text-xs font-medium text-slate-500">読了済み教材進捗</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">
                  {formatProgressRatio(summary.completedSectionCount, summary.totalSectionCount)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
                <p className="text-xs font-medium text-slate-500">確認テスト進捗</p>
                <p className="mt-2 text-xl font-semibold text-slate-800">
                  {formatProgressRatio(summary.passedTestCount, summary.totalTestCount)}
                </p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">1週間：学習時間</h2>
                <div className="mt-4 flex items-end gap-2 overflow-x-auto">
                  {last7Days.map((day) => (
                    <div key={day.key} className="flex min-w-[48px] flex-col items-center gap-2">
                      <div className="flex h-36 w-full items-end justify-center rounded-lg bg-slate-100">
                        <div
                          className="w-6 rounded-t-md bg-emerald-500 transition-all"
                          style={{ height: `${(day.totalMinutes / maxDailyMinutes) * 100 || 0}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-600">{day.label}</span>
                      <span className="text-[11px] text-slate-500">{formatDuration(day.totalMinutes)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">1週間：日報投稿状況</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {last7Days.map((day) => (
                    <div
                      key={`report-${day.key}`}
                      className={[
                        'flex h-10 w-12 flex-col items-center justify-center rounded-md border text-xs',
                        day.hasReport
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-slate-200 bg-slate-50 text-slate-500',
                      ].join(' ')}
                    >
                      <span>{day.label}</span>
                      <span className="text-[10px]">{day.hasReport ? '投稿済' : '未投稿'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">チャプター別 確認テスト進捗</h2>
                <div className="mt-4 space-y-3">
                  {chapterTests.length ? (
                    chapterTests.map((chapter, index) => {
                      const ratio = chapter.totalTests
                        ? Math.round((chapter.passedTests / chapter.totalTests) * 100)
                        : 0;
                      return (
                        <div
                          key={`${chapter.chapterId ?? 'none'}-${index}`}
                          className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                                {index + 1}
                              </span>
                              <p className="text-sm font-semibold text-slate-700 truncate max-w-[220px]">
                                {chapter.chapterTitle}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-slate-600">
                              {chapter.passedTests} / {chapter.totalTests}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-white">
                            <div
                              className="h-full rounded-full bg-brand transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, ratio))}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500">
                            正答率 {Math.min(100, Math.max(0, ratio))}% ({chapter.passedTests} / {chapter.totalTests})
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">公開されている確認テストがまだありません。</p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700">正答済みテストのチャプター比率</h2>
                <div className="mt-4 flex flex-col items-center gap-4">
                  <div className="h-48 w-48 rounded-full border border-slate-200 shadow-inner" style={{ background: pieStyles }} />
                  <ul className="w-full space-y-2 text-sm text-slate-600">
                    {hasPassedTests ? (
                      chapterTests
                        .filter((chapter) => chapter.passedTests > 0)
                        .map((chapter, index) => {
                          const totalPassed = chapterTests.reduce(
                            (acc, item) => acc + item.passedTests,
                            0,
                          );
                          const share = totalPassed
                            ? Math.round((chapter.passedTests / totalPassed) * 100)
                            : 0;
                          return (
                            <li key={`pie-${chapter.chapterId ?? index}`} className="flex items-center gap-3">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: palette[index % palette.length] }}
                              />
                              <span className="flex-1 truncate">{chapter.chapterTitle}</span>
                              <span className="text-xs text-slate-400">{share}%</span>
                            </li>
                          );
                        })
                    ) : (
                      <li className="text-sm text-slate-500">まだ正答済みの確認テストがありません。</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
