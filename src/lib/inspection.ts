import { requireGpsInfo, type GpsInfo } from "./gps";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

export const INSPECTION_QR_TYPE = "ollbareun-site-inspection";

export type InspectionSiteRow = {
  id: string;
  worksite_id: string;
  worksite_name: string;
  name: string;
  address: string;
  gps_info: GpsInfo;
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

function requireString(value: unknown, label: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label}을 입력하세요.`);
  }

  return value.trim();
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

export async function listInspectionSites(input: { name?: unknown } = {}) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const supabase = getSupabase();
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

  return attachWorksiteNames((sitesResult.data ?? []) as RawInspectionSite[], worksitesResult.data ?? []);
}

export async function createInspectionSite(input: {
  worksiteId: unknown;
  name: unknown;
  address: unknown;
  gpsInfo: unknown;
}) {
  const worksite_id = requireString(input.worksiteId, "근무지");
  const name = requireString(input.name, "현장명");
  const address = requireString(input.address, "현장주소");
  const gps_info = requireGpsInfo(input.gpsInfo);
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("inspection_sites")
    .insert({ worksite_id, name, address, gps_info })
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

export async function getInspectionSiteById(id: unknown) {
  const siteId = requireString(id, "현장");
  const supabase = getSupabase();
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
  name: unknown;
  address: unknown;
  gpsInfo: unknown;
}) {
  const siteId = requireString(input.id, "현장");
  const worksite_id = requireString(input.worksiteId, "근무지");
  const name = requireString(input.name, "현장명");
  const address = requireString(input.address, "현장주소");
  const gps_info = requireGpsInfo(input.gpsInfo);
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("inspection_sites")
    .update({ worksite_id, name, address, gps_info })
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

export async function deleteInspectionSite(id: unknown) {
  const siteId = requireString(id, "현장");
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("inspection_sites").delete().eq("id", siteId);
  throwIfError(error);
}

export async function createInspectionLog(input: {
  employeeId: unknown;
  employeeName: unknown;
  qrPayload: unknown;
}) {
  const employee_id = requireString(input.employeeId, "점검자");
  const employee_name = requireString(input.employeeName, "점검자명");
  const qrPayload = parseInspectionQrPayload(input.qrPayload);
  const supabase = getSupabase();

  const { data: site, error: siteError } = await supabase
    .from("inspection_sites")
    .select("*")
    .eq("id", qrPayload.siteId)
    .single();
  throwIfError(siteError);

  const { data: worksite, error: worksiteError } = await supabase
    .from("worksites")
    .select("id,name")
    .eq("id", site.worksite_id)
    .single();
  throwIfError(worksiteError);

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
  const supabase = getSupabase();
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
    employee_role: log.employee_id ? rolesByEmployeeId.get(log.employee_id) ?? "역할 없음" : "역할 없음",
  }));
}
