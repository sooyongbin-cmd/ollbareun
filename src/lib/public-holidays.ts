import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";

export function holidayYear(value: unknown) {
  const year = String(value ?? "");
  if (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 9998) throw new Error("연도는 1900~9998 사이로 입력해주세요.");
  return year;
}
export function holidayDate(value: unknown) {
  const date = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("올바른 날짜를 입력해주세요.");
  holidayYear(date.slice(0, 4));
  const parsed = new Date(date + "T00:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("올바른 날짜를 입력해주세요.");
  return date;
}
export async function insertHolidays(rows: { holiday_date: string; name: string | null; selected: string }[]) {
  if (!rows.length) return 0;
  const { data, error } = await getSupabaseAdmin().from("public_holidays")
    .upsert(rows, { onConflict: "holiday_date", ignoreDuplicates: true }).select("id");
  if (error) throw new Error("휴일을 저장하지 못했습니다.");
  return data?.length ?? 0;
}

type HolidayItem = { locdate: string | number; dateName: string; isHoliday: string };
export async function importHolidays(value: unknown) {
  const year = holidayYear(value);
  let key = process.env.DATA_GO_KR_SERVICE_KEY?.trim();
  if (!key) throw new Error("공공데이터포털 인증키(DATA_GO_KR_SERVICE_KEY)를 서버 환경변수에 등록해주세요.");
  // Accept either the portal's decoding key or its already encoded variant.
  if (key.includes("%")) {
    try { key = decodeURIComponent(key); } catch { throw new Error("공공데이터포털 인증키 형식을 확인해주세요."); }
  }
  const rows = new Map<string, { holiday_date: string; name: string; selected: string }>();
  for (let page = 1; page <= 10; page++) {
    const url = new URL("https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo");
    url.search = new URLSearchParams({ serviceKey: key, solYear: year, _type: "json", numOfRows: "100", pageNo: String(page) }).toString();
    let payload;
    try {
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      payload = await response.json();
    } catch {
      throw new Error("특일정보를 가져오지 못했습니다. API 인증키·활용승인 상태 및 연결을 확인해주세요.");
    }
    const result = payload?.response;
    if (String(result?.header?.resultCode) !== "00") throw new Error("특일정보 API 요청이 거절되었습니다. 인증키·활용승인 상태·요청 한도를 확인해주세요.");
    const total = Number(result.body?.totalCount);
    if (!Number.isInteger(total) || total < 0 || total > 1000) throw new Error("특일정보 응답 형식이 올바르지 않습니다.");
    const item = result.body?.items?.item;
    const items: HolidayItem[] = Array.isArray(item) ? item : item ? [item] : [];
    if (total > 0 && !items.length) throw new Error("특일정보 응답에 자료가 누락되었습니다.");
    for (const entry of items) {
      if (entry.isHoliday !== "Y") continue;
      const raw = String(entry.locdate);
      if (!/^\d{8}$/.test(raw) || !raw.startsWith(year)) throw new Error("특일정보의 날짜가 올바르지 않습니다.");
      const date = holidayDate(raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8));
      rows.set(date, { holiday_date: date, name: String(entry.dateName ?? "공휴일"), selected: "Y" });
    }
    if (page * 100 >= total) break;
  }
  const inserted = await insertHolidays([...rows.values()]);
  return { inserted, skipped: rows.size - inserted };
}
