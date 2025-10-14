export type DailyReportItemPayload = {
  id?: string;
  categoryId?: string | null;
  categoryName: string;
  minutes: number;
  note?: string;
  sortOrder: number;
};

export type DailyReportPayload = {
  date: string;
  reflectionText?: string;
  items: DailyReportItemPayload[];
};

export type DailyReportSummary = {
  id: string;
  date: string;
  totalMinutes: number;
  hasReflection: boolean;
};

export type DailyReportDetail = DailyReportSummary & {
  items: DailyReportItemPayload[];
  reflectionText?: string;
};

export type MonthlyGoal = {
  id: string;
  text: string;
  targetMinutes?: number | null;
  achievedMinutes: number;
  year: number;
  month: number;
};

export type MonthlySummary = {
  reportCount: number;
  totalMinutes: number;
  completedSectionCount: number;
  totalSectionCount: number;
  passedTestCount: number;
  totalTestCount: number;
};

export type WeeklySummary = {
  weekLabel: string;
  startDate: string;
  endDate: string;
  reportCount: number;
  totalMinutes: number;
};

export type CategoryShare = {
  categoryId?: string | null;
  categoryName: string;
  minutes: number;
  ratio: number;
};

export type Category = {
  id: string;
  name: string;
  color?: string | null;
};

export type ChapterTestProgress = {
  chapterId: string | null;
  chapterTitle: string;
  totalTests: number;
  passedTests: number;
};
