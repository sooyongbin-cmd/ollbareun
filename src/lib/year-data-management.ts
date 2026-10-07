import { getSupabaseAdmin } from "./supabase-admin";
import { emptyYearDataCounts, type YearDataCounts, type YearDataSummary } from "./year-data-types";

type ReportSnapshot = { id: string; photo_url: string | null; photo_urls: string[] | null };

export function requireDataYear(value: unknown) {
  if ((typeof value !== "number" && typeof value !== "string") || !/^\d{4}$/.test(String(value))) {
    throw new Error("삭제·조회할 연도를 선택하세요.");
  }
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1000 || year > 9998) throw new Error("연도가 올바르지 않습니다.");
  return year;
}

function throwError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getYearDataSummary(yearInput?: unknown): Promise<YearDataSummary> {
  const requestedYear = yearInput == null ? null : requireDataYear(yearInput);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("list_data_management_years");
  throwError(error);
  const years = ((data ?? []) as { year: number }[]).map((row) => row.year);
  const year = requestedYear != null && years.includes(requestedYear) ? requestedYear : years[0] ?? null;
  if (year == null) return { years, year, counts: { ...emptyYearDataCounts } };
  const result = await supabase.rpc("get_year_data_counts", { p_year: year });
  throwError(result.error);
  return { years, year, counts: result.data as YearDataCounts };
}

export function specialRemarkPhotoPath(photoUrl: string, origin: string) {
  const url = new URL(photoUrl);
  if (url.origin !== new URL(origin).origin) throw new Error("특이사항 사진의 저장소 주소를 확인할 수 없습니다.");
  const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/special-remarks\/(.+)$/);
  if (!match) throw new Error("특이사항 사진의 저장 경로를 확인할 수 없습니다.");
  const path = decodeURIComponent(match[1]);
  if (!path || path.split("/").some((part) => part === "." || part === "..")) throw new Error("특이사항 사진의 저장 경로가 올바르지 않습니다.");
  return path;
}

export async function deleteYearData(yearInput: unknown) {
  const year = requireDataYear(yearInput);
  const supabase = getSupabaseAdmin();
  const start = `${year}-01-01T00:00:00+09:00`;
  const end = `${year + 1}-01-01T00:00:00+09:00`;
  const reports: ReportSnapshot[] = [];
  // Read every report, not just the Data API's first 1,000 rows.
  for (let offset = 0; ; offset += 500) {
    const result = await supabase.from("inspection_special_reports")
      .select("id,photo_url,photo_urls").gte("reported_at", start).lt("reported_at", end)
      .order("id").range(offset, offset + 499);
    throwError(result.error);
    const batch = (result.data ?? []) as ReportSnapshot[];
    reports.push(...batch);
    if (batch.length < 500) break;
  }
  const urls = reports.flatMap((report) => [report.photo_url, ...(report.photo_urls ?? [])])
    .filter((url): url is string => Boolean(url));
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (urls.length > 0 && !origin) throw new Error("사진 저장소 설정을 확인할 수 없습니다. 자료는 삭제하지 않았습니다.");
  // Validate all URLs before deleting any objects. Never delete another bucket.
  const paths = Array.from(new Set(urls.map((url) => specialRemarkPhotoPath(url, origin!))));
  for (let offset = 0; offset < paths.length; offset += 100) {
    const { error } = await supabase.storage.from("special-remarks").remove(paths.slice(offset, offset + 100));
    if (error) throw new Error(`사진 삭제에 실패해 DB 자료는 삭제하지 않았습니다. 일부 사진은 이미 삭제되었을 수 있습니다. ${error.message}`);
  }
  const { data, error } = await supabase.rpc("delete_year_data", { p_year: year, p_reports: reports });
  if (error) throw new Error(`DB 자료 삭제에 실패했습니다. 사진이 있는 경우 일부 사진은 이미 삭제되었을 수 있습니다. ${error.message}`);
  return data as YearDataCounts;
}
