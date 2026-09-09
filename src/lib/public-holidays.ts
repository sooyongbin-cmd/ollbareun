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

const HOLIDAY_API_ENDPOINT = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
const HOLIDAY_API_TIMEOUT_MS = 15000;

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object" ? (value as RecordValue) : null;
}

function firstText(...values: unknown[]) {
  return values.find((value): value is string | number => (typeof value === "string" && value.trim() !== "") || typeof value === "number");
}

function cleanExternalText(value: unknown) {
  return String(value).replace(/\s+/g, " ").trim().slice(0, 300);
}

function extractXmlValue(body: string, tagName: string) {
  const match = body.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1]?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

function getApiErrorDetails(payload: unknown, rawBody: string) {
  const root = asRecord(payload);
  const serviceResponse = asRecord(root?.OpenAPI_ServiceResponse);
  const errorRoot = serviceResponse ?? root;
  const response = asRecord(errorRoot?.response);
  const responseHeader = asRecord(response?.header);
  const rootHeader = asRecord(errorRoot?.header);
  const commonHeader = asRecord(errorRoot?.cmmMsgHeader);
  const resultCode = firstText(
    responseHeader?.resultCode,
    rootHeader?.resultCode,
    commonHeader?.returnCode,
    commonHeader?.returnReasonCode,
    errorRoot?.resultCode,
    extractXmlValue(rawBody, "resultCode"),
    extractXmlValue(rawBody, "returnCode"),
    extractXmlValue(rawBody, "returnReasonCode"),
  );
  const resultMessage = firstText(
    responseHeader?.resultMsg,
    rootHeader?.resultMsg,
    commonHeader?.returnAuthMsg,
    commonHeader?.errMsg,
    errorRoot?.resultMsg,
    extractXmlValue(rawBody, "resultMsg"),
    extractXmlValue(rawBody, "errMsg"),
    extractXmlValue(rawBody, "returnAuthMsg"),
  );

  return {
    resultCode: resultCode === undefined ? undefined : cleanExternalText(resultCode),
    resultMessage: resultMessage === undefined ? undefined : cleanExternalText(resultMessage),
  };
}

function responseStatus(response: Response) {
  return `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
}

function responseErrorMessage(response: Response, payload: unknown, rawBody: string) {
  const details = getApiErrorDetails(payload, rawBody);
  const apiDetails = [
    details.resultCode ? `resultCode: ${details.resultCode}` : "",
    details.resultMessage ? `resultMsg: ${details.resultMessage}` : "",
  ].filter(Boolean).join(", ");
  const preview = rawBody && !apiDetails ? ` 응답 내용: ${cleanExternalText(rawBody)}` : "";
  return `특일정보 API가 HTTP ${responseStatus(response)}를 반환했습니다.${apiDetails ? ` (${apiDetails})` : "."}${preview}`;
}

function responseParseErrorMessage(response: Response, rawBody: string) {
  const details = getApiErrorDetails(null, rawBody);
  const apiDetails = [
    details.resultCode ? `resultCode: ${details.resultCode}` : "",
    details.resultMessage ? `resultMsg: ${details.resultMessage}` : "",
  ].filter(Boolean).join(", ");
  const preview = rawBody && !apiDetails ? ` 응답 내용: ${cleanExternalText(rawBody)}` : rawBody ? "" : " 응답 본문이 비어 있습니다.";
  return `특일정보 API 응답을 해석하지 못했습니다. (HTTP ${responseStatus(response)}, Content-Type: ${response.headers.get("content-type") ?? "알 수 없음"})${apiDetails ? ` (${apiDetails})` : ""}.${preview}`;
}

function connectionErrorMessage(error: unknown) {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return `특일정보 API 요청 시간이 ${HOLIDAY_API_TIMEOUT_MS / 1000}초를 초과했습니다. 공공데이터포털 연결 상태를 확인해주세요.`;
  }

  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return `특일정보 API에 연결하지 못했습니다. (원인: ${cleanExternalText(detail)}). 서버 네트워크와 공공데이터포털 서비스 상태를 확인해주세요.`;
}

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
    const url = new URL(HOLIDAY_API_ENDPOINT);
    url.search = new URLSearchParams({ serviceKey: key, solYear: year, _type: "json", numOfRows: "100", pageNo: String(page) }).toString();
    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(HOLIDAY_API_TIMEOUT_MS) });
    } catch (error) {
      throw new Error(connectionErrorMessage(error));
    }
    const rawBody = await response.text();
    let payload: unknown;
    try {
      payload = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      throw new Error(responseParseErrorMessage(response, rawBody));
    }
    if (!response.ok) throw new Error(responseErrorMessage(response, payload, rawBody));

    const payloadRecord = asRecord(payload);
    const result = payloadRecord?.response;
    const resultRecord = asRecord(result);
    const resultHeader = asRecord(resultRecord?.header);
    const resultBody = asRecord(resultRecord?.body);
    const resultCode = firstText(resultHeader?.resultCode);
    if (String(resultCode) !== "00") {
      const resultMessage = firstText(resultHeader?.resultMsg);
      const details = [
        resultCode !== undefined ? `resultCode: ${cleanExternalText(resultCode)}` : "resultCode 없음",
        resultMessage !== undefined ? `resultMsg: ${cleanExternalText(resultMessage)}` : "resultMsg 없음",
      ].join(", ");
      throw new Error(`특일정보 API가 오류를 반환했습니다. (${details})`);
    }
    const total = Number(resultBody?.totalCount);
    if (!Number.isInteger(total) || total < 0 || total > 1000) throw new Error(`특일정보 API 응답 형식이 올바르지 않습니다. (totalCount: ${String(resultBody?.totalCount ?? "없음")})`);
    const itemsRecord = asRecord(resultBody?.items);
    const item = itemsRecord?.item;
    const items: HolidayItem[] = Array.isArray(item) ? item : item ? [item] : [];
    if (total > 0 && !items.length) throw new Error(`특일정보 API 응답에 자료가 누락되었습니다. (totalCount: ${total})`);
    for (const entry of items) {
      if (entry.isHoliday !== "Y") continue;
      const raw = String(entry.locdate);
      if (!/^\d{8}$/.test(raw) || !raw.startsWith(year)) throw new Error(`특일정보 API 응답의 날짜 형식이 올바르지 않습니다. (locdate: ${raw})`);
      const date = holidayDate(raw.slice(0, 4) + "-" + raw.slice(4, 6) + "-" + raw.slice(6, 8));
      rows.set(date, { holiday_date: date, name: String(entry.dateName ?? "공휴일"), selected: "Y" });
    }
    if (page * 100 >= total) break;
  }
  const inserted = await insertHolidays([...rows.values()]);
  return { inserted, skipped: rows.size - inserted };
}
