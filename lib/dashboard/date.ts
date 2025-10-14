export function parseMonthParam(value?: string | null) {
  const now = new Date();
  if (!value) {
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error('invalid_month');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error('invalid_month');
  }
  return { year, month };
}

export function formatMonthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const next =
    month === 12
      ? new Date(Date.UTC(year + 1, 0, 1))
      : new Date(Date.UTC(year, month, 1));
  return {
    start: start.toISOString().slice(0, 10),
    next: next.toISOString().slice(0, 10),
  };
}

export function ensureDateString(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('invalid_date');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error('invalid_date');
  }
  return value;
}

export function daysRemainingInMonth(year: number, month: number) {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const targetMonthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart =
    month === 12
      ? new Date(Date.UTC(year + 1, 0, 1))
      : new Date(Date.UTC(year, month, 1));
  if (todayUtc < targetMonthStart) return Math.round((nextMonthStart.getTime() - targetMonthStart.getTime()) / (1000 * 60 * 60 * 24));
  if (todayUtc >= nextMonthStart) return 0;
  return Math.max(
    0,
    Math.round(
      (nextMonthStart.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );
}

export function totalDaysInMonth(year: number, month: number) {
  const nextMonth =
    month === 12
      ? new Date(Date.UTC(year + 1, 0, 1))
      : new Date(Date.UTC(year, month, 1));
  const currentMonthStart = new Date(Date.UTC(year, month - 1, 1));
  return Math.round(
    (nextMonth.getTime() - currentMonthStart.getTime()) /
      (1000 * 60 * 60 * 24),
  );
}
