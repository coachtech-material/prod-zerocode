"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  CategoryShare,
  DailyReportDetail,
  DailyReportItemPayload,
  DailyReportSummary,
  MonthlyGoal,
  MonthlySummary,
  WeeklySummary,
} from '@/lib/dashboard/types';
import { totalDaysInMonth } from '@/lib/dashboard/date';
import { fetchJson } from '@/lib/dashboard/client';
import {
  formatDateKey,
  formatDisplayDate,
  formatDuration,
  formatProgressRatio,
  pad,
} from '@/lib/dashboard/format';
import { createClient } from '@/lib/supabase/client';

const japaneseWeekdays = ['日', '月', '火', '水', '木', '金', '土'];

type MonthState = {
  year: number;
  month: number;
};

type GoalState = {
  goal: MonthlyGoal | null;
  achievedMinutes: number;
  remainingDays: number;
};

type ReportModalState = {
  open: boolean;
  mode: 'create' | 'edit';
};

const INITIAL_SUMMARY: MonthlySummary = {
  reportCount: 0,
  totalMinutes: 0,
  completedSectionCount: 0,
  totalSectionCount: 0,
  passedTestCount: 0,
  totalTestCount: 0,
};

const today = new Date();

type TimelineData = {
  startDate: Date;
  endDate: Date;
};

const RUNNER_EMOJI = '🏃‍♂️';
const TIMELINE_INTERVAL_DAYS = 1;
const DEFAULT_PROGRAM_LENGTH_DAYS = 14;
const MS_PER_DAY = 86_400_000;
const MIN_TIMELINE_STEP_WIDTH = 56;
const MIN_TIMELINE_WIDTH = 320;
const fullDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
});

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftMonth(state: MonthState, offset: number): MonthState {
  const date = new Date(Date.UTC(state.year, state.month - 1 + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function Calendar({
  year,
  month,
  selectedDate,
  badges,
  onSelectDate,
  onChangeMonth,
  minDate,
  maxDate,
}: {
  year: number;
  month: number;
  selectedDate: string;
  badges: Set<string>;
  onSelectDate: (date: string) => void;
  onChangeMonth: (offset: number) => void;
  minDate?: string;
  maxDate?: string;
}) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstDay.getUTCDay();
  const daysInMonth = totalDaysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)] p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
          className="rounded-full p-1 text-[color:var(--muted)] transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="前の月"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-slate-700">
          <CalendarIcon className="h-5 w-5" />
          <span className="text-base font-semibold">
            {year}年 {month}月
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChangeMonth(1)}
          className="rounded-full p-1 text-[color:var(--muted)] transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="次の月"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[color:var(--muted)]">
        {japaneseWeekdays.map((weekday) => (
          <div key={weekday} className="py-2">
            {weekday}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
        {weeks.map((week, weekIndex) => (
          <Fragment key={weekIndex}>
            {week.map((day, dayIndex) => {
              if (day === null) {
                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="h-12 rounded-lg border border-transparent"
                  />
                );
              }
              const dateKey = formatDateKey(year, month, day);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;
              const hasReport = badges.has(dateKey);
              const isBeforeMin = minDate ? dateKey < minDate : false;
              const isAfterMax = maxDate ? dateKey > maxDate : false;
              const isDisabled = isBeforeMin || isAfterMax;
              const highlightToday = isToday && !isSelected && !isDisabled;
              const classNames = [
                'relative flex h-12 flex-col items-center justify-center rounded-lg border text-sm transition',
              ];
              if (isDisabled) {
                classNames.push(
                  'cursor-not-allowed border-transparent text-slate-300 hover:border-transparent hover:bg-transparent',
                );
              } else if (isSelected) {
                classNames.push('border-brand bg-brand/10 text-brand');
              } else {
                classNames.push(
                  'border-transparent text-slate-700 hover:border-brand/40 hover:bg-brand/5',
                );
              }
              return (
                <button
                  key={`${weekIndex}-${day}`}
                  type="button"
                  onClick={() => {
                    if (!isDisabled) onSelectDate(dateKey);
                  }}
                  className={classNames.join(' ')}
                  disabled={isDisabled}
                >
                  <span
                    className={[
                      'inline-flex h-7 w-7 items-center justify-center rounded-full',
                      highlightToday
                        ? 'border border-brand text-brand'
                        : '',
                    ].join(' ')}
                  >
                    {day}
                  </span>
                  {hasReport && (
                    <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-brand"></span>
                  )}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-xl bg-[color:var(--surface-1)] px-4 py-3 text-sm text-[color:var(--muted)]">
      <span className="text-xs font-medium text-[color:var(--muted)]">{label}</span>
      <span className="mt-1 text-base font-semibold text-[color:var(--text)]">{value}</span>
    </div>
  );
}

function DailyReportPanel({
  selectedDate,
  detail,
  loading,
  onCreate,
  onEdit,
  onDelete,
}: {
  selectedDate: string;
  detail: DailyReportDetail | null;
  loading: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="surface-card rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--text)]">
            {formatDisplayDate(selectedDate)} の学習記録
          </h2>
          <p className="text-sm text-[color:var(--muted)]">学習の記録と感想を残しましょう。</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center text-[color:var(--muted)]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 読み込み中…
        </div>
      ) : detail ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-sm font-medium text-[color:var(--muted)] transition hover:border-brand hover:text-brand"
            >
              <Edit3 className="h-4 w-4" /> 編集
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> 削除
            </button>
          </div>
          <div className="grid gap-4">
            <div className="surface-card px-4 py-4">
              <p className="text-xs font-semibold text-[color:var(--muted)]">学習時間</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--text)]">
                {formatDuration(detail.totalMinutes)}
              </p>
            </div>
            <div className="surface-card px-4 py-4">
              <p className="text-xs font-semibold text-[color:var(--muted)]">完走（一言メモ）</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                {detail.reflectionText && detail.reflectionText.trim().length
                  ? detail.reflectionText
                  : '記録がありません。'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-brand/40 bg-brand/5 px-6 py-12 text-center">
          <p className="text-sm text-[color:var(--muted)]">
            まだ {formatDisplayDate(selectedDate)} の学習記録はありません。
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--brand-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand/90"
          >
            <Plus className="h-4 w-4" /> 学習を記録する
          </button>
        </div>
      )}
    </div>
  );
}

function ProjectTimeline({ startDate, endDate }: { startDate: Date; endDate: Date }) {
  const { milestones, activeIndex, startLabel, endLabel, progressPercent } = useMemo(() => {
    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);
    const normalizedToday = normalizeDate(new Date());

    let ensuredEnd = normalizedEnd;
    if (ensuredEnd.getTime() <= normalizedStart.getTime()) {
      ensuredEnd = new Date(normalizedStart);
      ensuredEnd.setDate(ensuredEnd.getDate() + TIMELINE_INTERVAL_DAYS);
    }

    const totalDays = Math.max(
      0,
      Math.round((ensuredEnd.getTime() - normalizedStart.getTime()) / MS_PER_DAY),
    );
    const markerDates: Date[] = [];
    for (let day = 0; day <= totalDays; day += TIMELINE_INTERVAL_DAYS) {
      const marker = new Date(normalizedStart);
      marker.setDate(normalizedStart.getDate() + day);
      markerDates.push(marker);
    }
    if (!markerDates.length || markerDates[markerDates.length - 1].getTime() !== ensuredEnd.getTime()) {
      markerDates.push(ensuredEnd);
    }

    let currentIndex = markerDates.findIndex(
      (marker) => normalizedToday.getTime() <= marker.getTime(),
    );
    if (currentIndex === -1) currentIndex = markerDates.length - 1;
    if (currentIndex < 0) currentIndex = 0;

    const milestones = markerDates.map((marker) => ({
      date: marker,
      label: shortDateFormatter.format(marker),
    }));
    const progressPercent =
      milestones.length > 1
        ? Math.min(100, Math.max(0, (currentIndex / (milestones.length - 1)) * 100))
        : milestones.length === 1
          ? normalizedToday.getTime() >= normalizedStart.getTime()
            ? 100
            : 0
          : 0;

    return {
      milestones,
      activeIndex: currentIndex,
      startLabel: fullDateFormatter.format(normalizedStart),
      endLabel: fullDateFormatter.format(ensuredEnd),
      progressPercent,
    };
  }, [startDate, endDate]);

  const minWidth = Math.max(milestones.length * MIN_TIMELINE_STEP_WIDTH, MIN_TIMELINE_WIDTH);

  return (
    <div className="mt-5">
      <div className="mt-3 overflow-x-auto overflow-y-visible">
        <div className="relative overflow-visible px-4 pb-14 pt-12" style={{ minWidth }}>
          <div className="absolute left-4 right-4 top-[60px] h-1 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="relative flex justify-between gap-6">
            {milestones.map((milestone, index) => {
              const completed = index <= activeIndex;
              const isCurrent = index === activeIndex;
              return (
                <div key={milestone.date.toISOString()} className="flex min-w-[52px] flex-col items-center">
                  <div className="relative flex h-[22px] w-full items-end justify-center overflow-visible">
                    {isCurrent && (
                      <span className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full scale-x-[-1] z-20 block text-4xl origin-bottom">
                        {RUNNER_EMOJI}
                      </span>
                    )}
                    <div
                      className={[
                        'relative z-10 h-4 w-4 rounded-full border-2 transition-all',
                        completed
                          ? 'border-brand bg-brand shadow-[0_0_0_3px_rgba(65,120,255,0.25)]'
                          : 'border-slate-300 bg-[color:var(--surface-1)] shadow-[0_0_0_2px_rgba(148,163,184,0.25)]',
                        isCurrent ? 'scale-110 shadow-[0_0_0_5px_rgba(65,120,255,0.28)]' : '',
                      ].join(' ')}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="mt-2 text-[11px] font-medium text-[color:var(--muted)]">{milestone.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyGoalCard({
  monthKey,
  goalState,
  onCreate,
  onEdit,
  timeline,
}: {
  monthKey: string;
  goalState: GoalState;
  onCreate: () => void;
  onEdit: () => void;
  timeline: TimelineData | null;
}) {
  const [year, month] = monthKey.split('-');
  const progress = useMemo(() => {
    if (!goalState.goal || !goalState.goal.targetMinutes) return 0;
    if (goalState.goal.targetMinutes <= 0) return 0;
    return Math.min(
      100,
      Math.round((goalState.achievedMinutes / goalState.goal.targetMinutes) * 100),
    );
  }, [goalState.goal, goalState.achievedMinutes]);

  const dayStats = useMemo(() => {
    if (!timeline) return null;
    const start = timeline.startDate instanceof Date ? timeline.startDate : new Date(timeline.startDate);
    const end = timeline.endDate instanceof Date ? timeline.endDate : new Date(timeline.endDate);
    const totalMs = end.getTime() - start.getTime();
    if (totalMs <= 0) return null;
    const totalDays = Math.max(1, Math.ceil(totalMs / MS_PER_DAY));
    const now = new Date();
    const remainingRaw = Math.ceil((end.getTime() - now.getTime()) / MS_PER_DAY);
    const remaining = Math.min(totalDays, Math.max(0, remainingRaw));
    const elapsed = Math.min(totalDays, Math.max(0, totalDays - remaining));
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));
    return {
      remainingDays: remaining,
      percent,
      startLabel: fullDateFormatter.format(start),
      endLabel: fullDateFormatter.format(end),
    };
  }, [timeline]);

  const goal = goalState.goal;

  const renderCreateButton = () => (
    <button
      type="button"
      onClick={onCreate}
      className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90"
    >
      <Plus className="h-4 w-4" /> 目標を作成する
    </button>
  );

  const renderGoalCard = () => {
    if (!goal) return null;
    return (
      <div className="relative flex h-full w-full max-w-full flex-col rounded-2xl border border-slate-100 bg-[color:var(--surface-1)]/60 px-6 py-4 text-sm text-slate-700 shadow-inner lg:h-full lg:w-full lg:self-stretch">
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-4">
            <p className="flex-1 leading-relaxed text-sm">{goal.text}</p>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-[color:var(--line)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] transition hover:border-brand hover:text-brand"
            >
              <Edit3 className="h-3.5 w-3.5" /> 編集
            </button>
          </div>
          {goal.targetMinutes ? (
            <div className="surface-card mt-3 space-y-2 p-3">
              <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                <span>
                  進捗: {formatDuration(goalState.achievedMinutes)} / {formatDuration(goal.targetMinutes)}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[color:var(--line)]/60">
                <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-1)] px-6 pt-3 pb-1 shadow-sm">
      <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-[color:var(--text)]">zerocode受講期間の進捗と目標</h3>
            {goal ? null : renderCreateButton()}
          </div>
        {(dayStats || goal) && (
          <div className="flex flex-col gap-1 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-stretch lg:gap-3">
            {dayStats ? (
              <div className="surface-card flex w-full flex-col items-stretch gap-2 rounded-2xl px-2 py-1 text-xs text-[color:var(--muted)] lg:w-auto lg:h-full lg:flex-row lg:items-stretch lg:gap-1 lg:self-stretch">
                <div className="flex flex-none flex-col gap-1">
                  <div className="flex min-h-[72px] min-w-[140px] flex-col items-center justify-center rounded-xl bg-[color:var(--surface-1)]/80 px-3 py-2 text-center shadow-inner">
                    <p className="text-[11px] text-[color:var(--muted)]">残受講期間</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{dayStats.remainingDays}日</p>
                  </div>
                  <div className="flex min-h-[72px] min-w-[140px] flex-col items-center justify-center rounded-xl bg-[color:var(--surface-1)]/80 px-3 py-2 text-center shadow-inner">
                    <p className="text-[11px] text-[color:var(--muted)]">進捗</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{dayStats.percent}%</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 lg:pl-1">
                  <div className="flex min-h-[72px] min-w-[140px] flex-col items-center justify-center rounded-xl bg-[color:var(--surface-1)]/80 px-3 py-2 text-center shadow-inner">
                    <p className="text-[11px] text-[color:var(--muted)]">受講開始日</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{dayStats.startLabel}</p>
                  </div>
                  <div className="flex min-h-[72px] min-w-[140px] flex-col items-center justify-center rounded-xl bg-[color:var(--surface-1)]/80 px-3 py-2 text-center shadow-inner">
                    <p className="text-[11px] text-[color:var(--muted)]">受講終了日</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{dayStats.endLabel}</p>
                  </div>
                </div>
              </div>
            ) : null}
            {goal ? renderGoalCard() : null}
          </div>
        )}
        {timeline && <ProjectTimeline startDate={timeline.startDate} endDate={timeline.endDate} />}
      </div>
    </div>
  );
}

function MonthlySummaryCard({ summary, onViewAnalysis }: { summary: MonthlySummary; onViewAnalysis: () => void }) {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-1)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[color:var(--text)]">月間分析レポート</h3>
          <p className="text-xs text-[color:var(--muted)]">今月の学習状況を確認しましょう。</p>
        </div>
        <button
          type="button"
          onClick={onViewAnalysis}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand/90 focus-ring"
        >
          詳細レポートはコチラ👀 <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SummaryBadge label="日報投稿日数" value={`${summary.reportCount}日`} />
        <SummaryBadge label="総合学習時間" value={formatDuration(summary.totalMinutes)} />
        <SummaryBadge
          label="読了済み教材進捗"
          value={formatProgressRatio(summary.completedSectionCount, summary.totalSectionCount)}
        />
        <SummaryBadge
          label="確認テスト進捗"
          value={formatProgressRatio(summary.passedTestCount, summary.totalTestCount)}
        />
      </div>
    </div>
  );
}

function DailyReportModal({
  open,
  date,
  mode,
  detail,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  date: string;
  mode: 'create' | 'edit';
  detail: DailyReportDetail | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { items: DailyReportItemPayload[]; reflectionText: string }) => Promise<void>;
}) {
  const initialTotalMinutes = detail && detail.items.length
    ? detail.items.reduce((acc, item) => acc + item.minutes, 0)
    : 60;
  const [hours, setHours] = useState(() => Math.floor(initialTotalMinutes / 60));
  const [minutes, setMinutes] = useState(() => initialTotalMinutes % 60);
  const [memo, setMemo] = useState(detail?.reflectionText ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const total = detail && detail.items.length
        ? detail.items.reduce((acc, item) => acc + item.minutes, 0)
        : 60;
      setHours(Math.floor(total / 60));
      setMinutes(total % 60);
      setMemo(detail?.reflectionText ?? '');
      setError(null);
    }
  }, [open, detail]);

  const handleSubmit = async () => {
    try {
      setError(null);
      const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
      if (totalMinutes <= 0) {
        throw new Error('学習時間は1分以上で入力してください');
      }
      const payload: DailyReportItemPayload[] = [
        {
          id: detail?.items?.[0]?.id,
          categoryId: detail?.items?.[0]?.categoryId ?? null,
          categoryName: '学習時間',
          minutes: totalMinutes,
          sortOrder: 0,
        },
      ];
      await onSubmit({ items: payload, reflectionText: memo.trim() });
    } catch (err: any) {
      setError(err?.message ?? '保存に失敗しました');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--overlay)] px-4 py-6">
      <div className="surface-menu w-full max-w-md overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[color:var(--line)] px-6 py-4">
          <div>
            <p className="text-xs font-medium text-[color:var(--muted)]">{formatDisplayDate(date)}</p>
            <h2 className="text-lg font-semibold text-[color:var(--text)]">
              {mode === 'edit' ? '日報を編集' : '日報を作成'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[color:var(--muted)] hover:text-slate-700"
          >
            閉じる
          </button>
        </div>
        <div className="space-y-6 px-6 py-6">
          <div>
            <label className="text-sm font-medium text-slate-700">学習時間</label>
            <p className="mt-1 text-xs text-[color:var(--muted)]">その日に学習した合計時間を入力してください。</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={hours}
                  onChange={(event) =>
                    setHours(Math.max(0, Number(event.target.value) || 0))
                  }
                  className="w-24 rounded-lg border border-[color:var(--line)] px-2 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <span className="text-xs text-[color:var(--muted)]">時間</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minutes}
                  onChange={(event) =>
                    setMinutes(
                      Math.min(59, Math.max(0, Number(event.target.value) || 0)),
                    )
                  }
                  className="w-24 rounded-lg border border-[color:var(--line)] px-2 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <span className="text-xs text-[color:var(--muted)]">分</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">完走（一言メモ）</label>
            <p className="mt-1 text-xs text-[color:var(--muted)]">その日の学習を振り返るひとことを残しましょう。</p>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="例：アウトプット中心で進められた"
            />
            <div className="mt-1 text-right text-xs text-slate-400">{memo.length}文字</div>
          </div>
          {error && (
            <div className="rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/15 px-3 py-2 text-sm text-[color:var(--danger)]">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[color:var(--line)] bg-[color:var(--surface-1)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--muted)] hover:bg-[color:var(--brand)]/10"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} 登録する
          </button>
        </div>
      </div>
    </div>
  );
}

type GoalModalProps = {
  open: boolean;
  monthKey: string;
  goalState: GoalState;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: { text: string; targetMinutes: number | null }) => Promise<void>;
};

function GoalModal({ open, monthKey, goalState, loading, onClose, onSubmit }: GoalModalProps) {
  const [text, setText] = useState(goalState.goal?.text ?? '');
  const [targetHours, setTargetHours] = useState(() =>
    goalState.goal?.targetMinutes ? Math.floor(goalState.goal.targetMinutes / 60) : 0,
  );
  const [targetMinutes, setTargetMinutes] = useState(() =>
    goalState.goal?.targetMinutes ? goalState.goal.targetMinutes % 60 : 0,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setText(goalState.goal?.text ?? '');
      setTargetHours(
        goalState.goal?.targetMinutes ? Math.floor(goalState.goal.targetMinutes / 60) : 0,
      );
      setTargetMinutes(goalState.goal?.targetMinutes ? goalState.goal.targetMinutes % 60 : 0);
      setError(null);
    }
  }, [open, goalState.goal]);

  if (!open) return null;

  const handleSubmit = async () => {
    try {
      if (!text.trim()) {
        throw new Error('目標内容を入力してください');
      }
      const total = targetHours * 60 + targetMinutes;
      await onSubmit({ text: text.trim(), targetMinutes: total > 0 ? total : null });
    } catch (err: any) {
      setError(err?.message ?? '保存に失敗しました');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--overlay)] px-4 py-6">
      <div className="surface-menu w-full max-w-lg overflow-hidden rounded-2xl">
        <div className="border-b border-[color:var(--line)] px-6 py-4">
          <p className="text-xs font-medium text-[color:var(--muted)]">{monthKey}</p>
          <h2 className="text-lg font-semibold text-[color:var(--text)]">月間目標を設定</h2>
        </div>
        <div className="space-y-4 px-6 py-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--text)]">
              目標内容
            </label>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--surface-1)] px-3 py-2 text-sm text-[color:var(--text)] shadow-[var(--shadow-1)] focus-ring"
              placeholder="例：毎日2時間Laravelの実装練習を行う"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--text)]">
              目標時間（任意）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={targetHours}
                onChange={(event) => setTargetHours(Number(event.target.value))}
                className="w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-1)] px-2 py-2 text-sm text-[color:var(--text)] shadow-[var(--shadow-1)] focus-ring"
              />
              <span className="text-xs text-[color:var(--muted)]">時間</span>
              <input
                type="number"
                min={0}
                max={59}
                value={targetMinutes}
                onChange={(event) => setTargetMinutes(Number(event.target.value))}
                className="w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-1)] px-2 py-2 text-sm text-[color:var(--text)] shadow-[var(--shadow-1)] focus-ring"
              />
              <span className="text-xs text-[color:var(--muted)]">分</span>
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/15 px-3 py-2 text-sm text-[color:var(--danger)]">
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[color:var(--line)] bg-[color:var(--surface-1)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--line)] px-4 py-2 text-sm text-[color:var(--muted)] hover:bg-[color:var(--brand)]/10"
            disabled={loading}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand-strong)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} 保存する
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialDate = useMemo(() => {
    const param = searchParams.get('date');
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      return param;
    }
    return formatDateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }, [searchParams]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [currentMonth, setCurrentMonth] = useState<MonthState>(() => {
    const [yearStr, monthStr] = initialDate.split('-');
    return { year: Number(yearStr), month: Number(monthStr) };
  });
  const [reports, setReports] = useState<Record<string, DailyReportSummary>>({});
  const [detail, setDetail] = useState<DailyReportDetail | null>(null);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>(INITIAL_SUMMARY);
  const [goalState, setGoalState] = useState<GoalState>({
    goal: null,
    achievedMinutes: 0,
    remainingDays: 0,
  });
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [, setWeeklyStats] = useState<WeeklySummary[]>([]);
  const [, setCategoryShare] = useState<CategoryShare[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<ReportModalState>({ open: false, mode: 'create' });
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const monthKey = useMemo(
    () => `${currentMonth.year}-${pad(currentMonth.month)}`,
    [currentMonth],
  );

  const badges = useMemo(() => new Set(Object.keys(reports)), [reports]);

  const trainingStartKey = useMemo(() => {
    if (!timeline) return undefined;
    const start = timeline.startDate;
    return formatDateKey(start.getFullYear(), start.getMonth() + 1, start.getDate());
  }, [timeline]);

  const trainingEndKey = useMemo(() => {
    if (!timeline) return undefined;
    const end = timeline.endDate;
    return formatDateKey(end.getFullYear(), end.getMonth() + 1, end.getDate());
  }, [timeline]);

  const clampDate = useCallback(
    (value: string | null | undefined) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
      }
      let result = value;
      if (trainingStartKey && result < trainingStartKey) {
        result = trainingStartKey;
      }
      if (trainingEndKey && result > trainingEndKey) {
        result = trainingEndKey;
      }
      return result;
    },
    [trainingStartKey, trainingEndKey],
  );

  useEffect(() => {
    const param = searchParams.get('date');
    const normalized = clampDate(param);
    const currentSelected = selectedDateRef.current;

    if (normalized && normalized !== currentSelected) {
      setSelectedDate(normalized);
      const [yearStr, monthStr] = normalized.split('-');
      setCurrentMonth({ year: Number(yearStr), month: Number(monthStr) });
    }

    if (param && normalized && normalized !== param) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', normalized);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [searchParams, clampDate, router, pathname]);

  useEffect(() => {
    if (!selectedDate) return;
    const currentParam = searchParams.get('date');
    if (currentParam === selectedDate) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', selectedDate);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [selectedDate, searchParams, router, pathname]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        const issuedAt = profile?.created_at ? new Date(profile.created_at) : new Date();
        const start = normalizeDate(issuedAt);
        const end = new Date(start);
        end.setDate(end.getDate() + DEFAULT_PROGRAM_LENGTH_DAYS);
        if (mounted) {
          setTimeline({ startDate: start, endDate: end });
        }
      } catch (err) {
        console.error('Failed to load program timeline', err);
        if (mounted) {
          const start = normalizeDate(new Date());
          const end = new Date(start);
          end.setDate(end.getDate() + DEFAULT_PROGRAM_LENGTH_DAYS);
          setTimeline({ startDate: start, endDate: end });
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadMonthData = useCallback(async () => {
    setLoadingMonth(true);
    setError(null);
    try {
      const [reportRes, summaryRes, goalRes, weeklyRes, shareRes] = await Promise.all([
        fetchJson<{ reports: DailyReportSummary[] }>(
          `/api/dashboard/daily-reports?month=${monthKey}`,
        ),
        fetchJson<MonthlySummary>(`/api/dashboard/stats/monthly-summary?month=${monthKey}`),
        fetchJson<{
          goal: MonthlyGoal | null;
          achievedMinutes: number;
          remainingDays: number;
        }>(`/api/dashboard/monthly-goal?month=${monthKey}`),
        fetchJson<{ weeks: WeeklySummary[] }>(`/api/dashboard/stats/weekly?month=${monthKey}`),
        fetchJson<{ categories: CategoryShare[] }>(
          `/api/dashboard/stats/category-share?month=${monthKey}`,
        ),
      ]);

      const reportMap: Record<string, DailyReportSummary> = {};
      reportRes.reports?.forEach((report) => {
        reportMap[report.date] = report;
      });
      setReports(reportMap);
      setMonthlySummary(summaryRes);
      setGoalState({
        goal: goalRes.goal,
        achievedMinutes: goalRes.achievedMinutes,
        remainingDays: goalRes.remainingDays,
      });
      setWeeklyStats(weeklyRes.weeks ?? []);
      setCategoryShare(shareRes.categories ?? []);
    } catch (err) {
      console.error(err);
      setError('ダッシュボード情報の取得に失敗しました');
    } finally {
      setLoadingMonth(false);
    }
  }, [monthKey]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const loadDetail = useCallback(
    async (date: string) => {
      setLoadingDetail(true);
      try {
        const res = await fetchJson<{ report: DailyReportDetail | null }>(
          `/api/dashboard/daily-reports/${date}`,
        );
        setDetail(res.report);
      } catch (err) {
        console.error(err);
        setDetail(null);
      } finally {
        setLoadingDetail(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadDetail(selectedDate);
  }, [selectedDate, loadDetail]);

  useEffect(() => {
    const normalized = clampDate(selectedDate);
    if (!normalized || normalized === selectedDate) return;
    setSelectedDate(normalized);
    const [yearStr, monthStr] = normalized.split('-');
    setCurrentMonth((prev) =>
      prev.year === Number(yearStr) && prev.month === Number(monthStr)
        ? prev
        : { year: Number(yearStr), month: Number(monthStr) },
    );
  }, [selectedDate, clampDate]);

  const handleChangeMonth = (offset: number) => {
    setCurrentMonth((prev) => {
      const next = shiftMonth(prev, offset);
      const currentDay = Number(selectedDate.slice(8, 10));
      const daysInNext = totalDaysInMonth(next.year, next.month);
      const nextDay = Math.min(currentDay || 1, daysInNext);
      const candidate = formatDateKey(next.year, next.month, nextDay);
      const normalized = clampDate(candidate) ?? candidate;
      if (normalized !== selectedDate) {
        setSelectedDate(normalized);
      }
      return next;
    });
  };

  const handleCreateReport = () => {
    setReportModal({ open: true, mode: 'create' });
  };

  const handleEditReport = () => {
    setReportModal({ open: true, mode: detail ? 'edit' : 'create' });
  };

  const handleDeleteReport = async () => {
    if (!detail) return;
    if (!window.confirm('この日報を削除しますか？')) return;
    try {
      await fetchJson(`/api/dashboard/daily-reports/${selectedDate}`, {
        method: 'DELETE',
      });
      setDetail(null);
      setReports((prev) => {
        const next = { ...prev };
        delete next[selectedDate];
        return next;
      });
      await loadMonthData();
    } catch (err) {
      console.error(err);
      setError('日報の削除に失敗しました');
    }
  };

  const handleSaveReport = async ({
    items,
    reflectionText,
  }: {
    items: DailyReportItemPayload[];
    reflectionText: string;
  }) => {
    try {
      setSavingReport(true);
      await fetchJson(`/api/dashboard/daily-reports`, {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          items,
          reflectionText,
        }),
      });
      setReportModal({ open: false, mode: 'create' });
      await Promise.all([loadMonthData(), loadDetail(selectedDate)]);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setSavingReport(false);
    }
  };

  const handleSaveGoal = async ({
    text,
    targetMinutes,
  }: {
    text: string;
    targetMinutes: number | null;
  }) => {
    try {
      setSavingGoal(true);
      await fetchJson(`/api/dashboard/monthly-goal?month=${monthKey}`, {
        method: 'PUT',
        body: JSON.stringify({ text, targetMinutes }),
      });
      setGoalModalOpen(false);
      await loadMonthData();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[color:var(--text)]">ダッシュボード</h1>
        <p className="text-sm text-[color:var(--muted)]">
          日報を記録し、目標と学習状況を振り返りましょう。
        </p>
      </header>
      <MonthlyGoalCard
        monthKey={monthKey}
        goalState={goalState}
        onCreate={() => setGoalModalOpen(true)}
        onEdit={() => setGoalModalOpen(true)}
        timeline={timeline}
      />
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Calendar
            year={currentMonth.year}
            month={currentMonth.month}
            selectedDate={selectedDate}
            badges={badges}
            onSelectDate={setSelectedDate}
            onChangeMonth={handleChangeMonth}
            minDate={trainingStartKey}
            maxDate={trainingEndKey}
          />
        </div>
        <div className="space-y-6">
          <DailyReportPanel
            selectedDate={selectedDate}
            detail={detail}
            loading={loadingDetail}
            onCreate={handleCreateReport}
            onEdit={handleEditReport}
            onDelete={handleDeleteReport}
          />
          <MonthlySummaryCard
            summary={monthlySummary}
            onViewAnalysis={() => (window.location.href = '/analysis')}
          />
        </div>
      </div>
      <DailyReportModal
        open={reportModal.open}
        mode={reportModal.mode}
        date={selectedDate}
        detail={detail}
        loading={savingReport}
        onClose={() => setReportModal({ open: false, mode: 'create' })}
        onSubmit={handleSaveReport}
      />
      <GoalModal
        open={goalModalOpen}
        monthKey={monthKey}
        goalState={goalState}
        loading={savingGoal}
        onClose={() => setGoalModalOpen(false)}
        onSubmit={handleSaveGoal}
      />
    </div>
  );
}
