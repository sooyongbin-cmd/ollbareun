import type { SupabaseClient } from "@supabase/supabase-js";
import { requireGpsInfo, type GpsInfo } from "./gps";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

export const INSPECTION_QR_TYPE = "ollbareun-site-inspection";

export type InspectionSiteRow = {
  id: string;
  worksite_id: string;
  worksite_name: string;
  sort_order: number;
  name: string;
  address: string;
  gps_info: GpsInfo;
  today_inspection?: {
    inspected_at: string;
    employee_name: string;
    employee_role: string;
  } | null;
  created_at?: string;
  updated_at?: string;
};

export type InspectionLogRow = {
  id: string;
  inspection_site_id: string | null;
  worksite_id: string | null;
  employee_id: string | null;
  employee_name: string;
  employee_role?: string;
  worksite_name: string;
  site_name: string;
  site_gps_info: GpsInfo;
  qr_payload: InspectionQrPayload;
  inspected_at: string;
  created_at?: string;
};

export type InspectionQrPayload = {
  type: typeof INSPECTION_QR_TYPE;
  version: 1;
  siteId: string;
  worksiteId: string;
  worksiteName: string;
  siteName: string;
  gpsInfo: GpsInfo;
};

type RawInspectionSite = Omit<InspectionSiteRow, "worksite_name">;

type TodayInspectionLog = Pick<InspectionLogRow, "inspection_site_id" | "inspected_at" | "employee_id" | "employee_name">;

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}을 입력하세요.`);
  }

  return value.trim();
}

function requirePositiveInteger(value: unknown, label: string) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${label}는 1 이상의 정수로 입력하세요.`);
  }

  return numberValue;
}

function throwIfError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function parsePayloadObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      throw new Error("QR 코드 내용을 읽을 수 없습니다.");
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new Error("QR 코드 내용을 읽을 수 없습니다.");
}

function attachWorksiteNames(sites: RawInspectionSite[], worksites: Array<{ id: string; name: string }>) {
  const worksitesById = new Map(worksites.map((worksite) => [worksite.id, worksite.name]));

  return sites.map((site) => ({
    ...site,
    worksite_name: worksitesById.get(site.worksite_id) ?? "근무지 없음",
  })) as InspectionSiteRow[];
}

function getSeoulTodayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const start = new Date(`${values.year}-${values.month}-${values.day}T00:00:00+09:00`);

  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function attachTodayInspections(sites: InspectionSiteRow[], supabase: SupabaseClient) {
  const { start, end } = getSeoulTodayRange();
  const { data, error } = await supabase
    .from("inspection_logs")
    .select("inspection_site_id, inspected_at, employee_id, employee_name")
    .gte("inspected_at", start)
    .lt("inspected_at", end)
    .order("inspected_at", { ascending: false });

  throwIfError(error);

  const logs = (data ?? []) as TodayInspectionLog[];
  const employeeIds = Array.from(new Set(logs.map((log) => log.employee_id).filter((id): id is string => Boolean(id))));
  const rolesByEmployeeId = new Map<string, string>();

  if (employeeIds.length > 0) {
    const { data: employees, error: employeeError } = await supabase
      .from("employees")
      .select("id,role")
      .in("id", employeeIds);
    throwIfError(employeeError);

    for (const employee of employees ?? []) {
      rolesByEmployeeId.set(employee.id, employee.role);
    }
  }

  const latestInspectionBySiteId = new Map<string, InspectionSiteRow["today_inspection"]>();
  for (const log of logs) {
    if (!log.inspection_site_id || latestInspectionBySiteId.has(log.inspection_site_id)) {
      continue;
    }

    latestInspectionBySiteId.set(log.inspection_site_id, {
      inspected_at: log.inspected_at,
      employee_name: log.employee_name,
      employee_role: log.employee_id ? rolesByEmployeeId.get(log.employee_id) ?? "직군 없음" : "직군 없음",
    });
  }

  return sites.map((site) => ({
    ...site,
    today_inspection: latestInspectionBySiteId.get(site.id) ?? null,
  }));
}

export function buildInspectionQrPayload(site: Pick<InspectionSiteRow, "id" | "worksite_id" | "worksite_name" | "name" | "gps_info">): InspectionQrPayload {
  return {
    type: INSPECTION_QR_TYPE,
    version: 1,
    siteId: site.id,
    worksiteId: site.worksite_id,
    worksiteName: site.worksite_name,
    siteName: site.name,
    gpsInfo: site.gps_info,
  };
}

export function parseInspectionQrPayload(value: unknown): InspectionQrPayload {
  const payload = parsePayloadObject(value);

  if (payload.type !== INSPECTION_QR_TYPE || payload.version !== 1) {
    throw new Error("현장점검 QR 코드가 아닙니다.");
  }

  return {
    type: INSPECTION_QR_TYPE,
    version: 1,
    siteId: requireString(payload.siteId, "현장"),
    worksiteId: requireString(payload.worksiteId, "근무지"),
    worksiteName: requireString(payload.worksiteName, "근무지명"),
    siteName: requireString(payload.siteName, "현장명"),
    gpsInfo: requireGpsInfo(payload.gpsInfo),
  };
}

export function compareInspectionSites<T extends { worksite_name?: string | null; sort_order?: number | null; name?: string | null }>(
  left: T,
  right: T,
) {
  const worksiteComparison = (right.worksite_name ?? "").localeCompare(left.worksite_name ?? "", "ko-KR");
  if (worksiteComparison !== 0) {
    return worksiteComparison;
  }

  const leftOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER;
  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return (right.name ?? "").localeCompare(left.name ?? "", "ko-KR");
}

export async function listInspectionSites(
  input: { name?: unknown } = {},
  supabase: SupabaseClient = getSupabase(),
) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const sitesQuery = supabase
    .from("inspection_sites")
    .select("*")
    .order("created_at", { ascending: false });

  const sitesResult = name
    ? await sitesQuery.ilike("name", `%${name}%`)
    : await sitesQuery;
  const worksitesResult = await supabase.from("worksites").select("id,name");

  throwIfError(sitesResult.error);
  throwIfError(worksitesResult.error);

  const sites = attachWorksiteNames((sitesResult.data ?? []) as RawInspectionSite[], worksitesResult.data ?? []);

  const sitesWithTodayInspections = await attachTodayInspections(sites, supabase);

  return sitesWithTodayInspections.sort(compareInspectionSites);
}

export async function createInspectionSite(input: {
  worksiteId: unknown;
  sortOrder: unknown;
  name: unknown;
  address: unknown;
  gpsInfo: unknown;
}, supabase: SupabaseClient = getSupabase()) {
  const worksite_id = requireString(input.worksiteId, "근무지");
  const sort_order = requirePositiveInteger(input.sortOrder, "점검순서");
  const name = requireString(input.name, "현장명");
  const address = requireString(input.address, "현장주소");
  const gps_info = requireGpsInfo(input.gpsInfo);
  const { data, error } = await supabase
    .from("inspection_sites")
    .insert({ worksite_id, sort_order, name, address, gps_info })
    .select("*")
    .single();

  throwIfError(error);

  const { data: worksite, error: worksiteError } = await supabase
    .from("worksites")
    .select("id,name")
    .eq("id", worksite_id)
    .single();

  throwIfError(worksiteError);

  return {
    ...(data as RawInspectionSite),
    worksite_name: worksite?.name ?? "근무지 없음",
  } as InspectionSiteRow;
}

export async function getInspectionSiteById(id: unknown, supabase: SupabaseClient = getSupabase()) {
  const siteId = requireString(id, "현장");
  const { data, error } = await supabase.from("inspection_sites").select("*").eq("id", siteId).single();
  throwIfError(error);

  const { data: worksite, error: worksiteError } = await supabase
    .from("worksites")
    .select("id,name")
    .eq("id", data.worksite_id)
    .single();
  throwIfError(worksiteError);

  return {
    ...(data as RawInspectionSite),
    worksite_name: worksite?.name ?? "근무지 없음",
  } as InspectionSiteRow;
}

export async function updateInspectionSite(input: {
  id: unknown;
  worksiteId: unknown;
  sortOrder: unknown;
  name: unknown;
  address: unknown;
  gpsInfo: unknown;
}, supabase: SupabaseClient = getSupabaseAdmin()) {
  const siteId = requireString(input.id, "현장");
  const worksite_id = requireString(input.worksiteId, "근무지");
  const sort_order = requirePositiveInteger(input.sortOrder, "점검순서");
  const name = requireString(input.name, "현장명");
  const address = requireString(input.address, "현장주소");
  const gps_info = requireGpsInfo(input.gpsInfo);
  const { data, error } = await supabase
    .from("inspection_sites")
    .update({ worksite_id, sort_order, name, address, gps_info })
    .eq("id", siteId)
    .select("*")
    .single();

  throwIfError(error);

  const { data: worksite, error: worksiteError } = await supabase
    .from("worksites")
    .select("id,name")
    .eq("id", worksite_id)
    .single();

  throwIfError(worksiteError);

  return {
    ...(data as RawInspectionSite),
    worksite_name: worksite?.name ?? "근무지 없음",
  } as InspectionSiteRow;
}

export async function swapInspectionSiteSortOrder(input: {
  draggedSiteId: unknown;
  targetSiteId: unknown;
}, supabase: SupabaseClient = getSupabaseAdmin()) {
  const draggedSiteId = requireString(input.draggedSiteId, "이동할 현장");
  const targetSiteId = requireString(input.targetSiteId, "대상 현장");
  if (draggedSiteId === targetSiteId) {
    throw new Error("서로 다른 현장을 선택하세요.");
  }

  const { data: sites, error: sitesError } = await supabase
    .from("inspection_sites")
    .select("id,worksite_id,sort_order")
    .in("id", [draggedSiteId, targetSiteId]);
  throwIfError(sitesError);
  const draggedSite = sites?.find((site) => site.id === draggedSiteId);
  const targetSite = sites?.find((site) => site.id === targetSiteId);
  if (!draggedSite || !targetSite) {
    throw new Error("현장 정보를 찾을 수 없습니다.");
  }
  if (draggedSite.worksite_id !== targetSite.worksite_id) {
    throw new Error("같은 근무지 안에서만 순서를 변경할 수 있습니다.");
  }

  const draggedOrder = draggedSite.sort_order;
  const targetOrder = targetSite.sort_order;
  const temporaryOrder = Math.max(draggedOrder, targetOrder) + 1;
  const updates = [
    { id: draggedSiteId, order: temporaryOrder },
    { id: targetSiteId, order: draggedOrder },
    { id: draggedSiteId, order: targetOrder },
  ];

  for (const update of updates) {
    const { error } = await supabase
      .from("inspection_sites")
      .update({ sort_order: update.order })
      .eq("id", update.id);
    throwIfError(error);
  }
}

export async function deleteInspectionSite(id: unknown, supabase: SupabaseClient = getSupabaseAdmin()) {
  const siteId = requireString(id, "현장");
  const { error } = await supabase.from("inspection_sites").delete().eq("id", siteId);
  throwIfError(error);
}

export async function createInspectionLog(input: {
  employeeId: unknown;
  employeeName: unknown;
  qrPayload: unknown;
  authorizedWorksiteId?: unknown;
}, supabase: SupabaseClient = getSupabaseAdmin()) {
  const employee_id = requireString(input.employeeId, "점검자");
  const employee_name = requireString(input.employeeName, "점검자명");
  const qrPayload = parseInspectionQrPayload(input.qrPayload);

  const { data: site, error: siteError } = await supabase
    .from("inspection_sites")
    .select("*")
    .eq("id", qrPayload.siteId)
    .maybeSingle();
  throwIfError(siteError);
  if (!site) {
    throw new Error("NFC 태그에 연결된 현장 정보를 찾을 수 없습니다.");
  }
  if (input.authorizedWorksiteId && site.worksite_id !== input.authorizedWorksiteId) {
    throw new Error("배정된 근무지의 현장만 점검할 수 있습니다.");
  }

  const { data: worksite, error: worksiteError } = await supabase
    .from("worksites")
    .select("id,name")
    .eq("id", site.worksite_id)
    .maybeSingle();
  throwIfError(worksiteError);
  if (!worksite) {
    throw new Error("NFC 태그에 연결된 근무지 정보를 찾을 수 없습니다.");
  }

  const { data, error } = await supabase
    .from("inspection_logs")
    .insert({
      inspection_site_id: site.id,
      worksite_id: site.worksite_id,
      employee_id,
      employee_name,
      worksite_name: worksite?.name ?? "근무지 없음",
      site_name: site.name,
      site_gps_info: requireGpsInfo(site.gps_info),
      qr_payload: qrPayload,
    })
    .select("*")
    .single();

  throwIfError(error);
  return data as InspectionLogRow;
}

export async function listInspectionLogs(input: { worksiteId?: unknown } = {}) {
  const worksiteId = typeof input.worksiteId === "string" ? input.worksiteId.trim() : "";
  const supabase = getSupabaseAdmin();
  const query = supabase.from("inspection_logs").select("*").order("inspected_at", { ascending: false });
  const { data, error } = worksiteId ? await query.eq("worksite_id", worksiteId) : await query;

  throwIfError(error);
  const logs = (data ?? []) as InspectionLogRow[];
  const employeeIds = Array.from(new Set(logs.map((log) => log.employee_id).filter((id): id is string => Boolean(id))));

  if (employeeIds.length === 0) {
    return logs;
  }

  const { data: employees, error: employeeError } = await supabase
    .from("employees")
    .select("id,role")
    .in("id", employeeIds);
  throwIfError(employeeError);

  const rolesByEmployeeId = new Map((employees ?? []).map((employee) => [employee.id, employee.role]));
  return logs.map((log) => ({
    ...log,
    employee_role: log.employee_id ? rolesByEmployeeId.get(log.employee_id) ?? "직군 없음" : "직군 없음",
  }));
}
