export const yearDataTables = [
  { table: "work_record", label: "근태" },
  { table: "leave", label: "휴가" },
  { table: "public_holidays", label: "공휴일" },
  { table: "education_completions", label: "교육" },
  { table: "inspection_logs", label: "점검지" },
  { table: "inspection_special_reports", label: "특이사항" },
] as const;

export type YearDataCounts = Record<(typeof yearDataTables)[number]["table"], number>;
export type YearDataSummary = { years: number[]; year: number | null; counts: YearDataCounts };
export const emptyYearDataCounts: YearDataCounts = {
  work_record: 0, leave: 0, public_holidays: 0, education_completions: 0,
  inspection_logs: 0, inspection_special_reports: 0,
};
