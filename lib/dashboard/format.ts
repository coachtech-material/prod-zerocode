export function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function formatDisplayDate(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}時間${mins}分`;
  if (hours) return `${hours}時間`;
  return `${mins}分`;
}

export function formatProgressRatio(completed: number, total: number) {
  const safeCompleted = Number.isFinite(completed) ? Math.max(0, Math.floor(completed)) : 0;
  const safeTotal = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  if (!safeTotal) {
    return `${safeCompleted} / ${safeTotal}`;
  }
  const pct = Math.round((safeCompleted / safeTotal) * 100);
  return `${safeCompleted} / ${safeTotal} (${pct}%)`;
}
