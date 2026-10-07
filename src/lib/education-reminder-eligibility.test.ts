import { expect, it } from "vitest";
import { getMissingEducationCounts } from "./education-reminder-notifications";

const job = { work_record_id: "w", employee_id: "e", work_date: "2026-10-07", due_at: "2026-10-07T01:00:00Z", attempts: 1 };
function resource(id: string, education_type = "기타", startdate = "2026-10-07", enddate = "2026-10-07") {
  return { id, title: id, education_type, startdate, enddate, created_at: "2026-01-01T00:00:00Z" };
}
function completion(title: string, education_type: string, work_date: string, employee_id = "e") {
  return { id: title, title, education_type, work_date, employee_id };
}

it("includes both date boundaries and excludes resources outside the attendance date", () => {
  const resources = [resource("start", "일일", "2026-10-07", "2026-10-31"), resource("end", "기타", "2026-01-01", "2026-10-07"), resource("expired", "분기", "2026-01-01", "2026-10-06"), resource("future", "반기", "2026-10-08", "2026-12-31")];
  expect(getMissingEducationCounts([job], resources, []).get("w")).toBe(2);
});

it("accepts other education completions regardless of period, but matches employee and subject", () => {
  const resources = [resource("old"), resource("later"), resource("missing"), resource("wrongEmployee"), resource("wrongType")];
  const completions = [completion("old", "기타", "2020-01-01"), completion("later", "기타", "2026-10-08"), completion("wrongEmployee", "기타", "2020-01-01", "another"), completion("wrongType", "월간", "2026-10-07")];
  expect(getMissingEducationCounts([job], resources, completions).get("w")).toBe(3);
});

it("keeps daily, monthly, quarterly and semiannual completion periods", () => {
  const resources = [resource("d", "일일"), resource("m", "월간"), resource("q", "분기"), resource("h", "반기")];
  expect(getMissingEducationCounts([job], resources, [completion("d", "일일", "2026-10-06"), completion("m", "월간", "2026-09-30"), completion("q", "분기", "2026-09-30"), completion("h", "반기", "2026-06-30")]).get("w")).toBe(4);
  expect(getMissingEducationCounts([job], resources, [completion("d", "일일", "2026-10-07"), completion("m", "월간", "2026-10-01"), completion("q", "분기", "2026-10-01"), completion("h", "반기", "2026-07-01")]).get("w")).toBe(0);
});
