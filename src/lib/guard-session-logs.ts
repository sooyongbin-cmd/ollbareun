import { getSupabase } from "./supabase";

export type GuardLoginStatus = "success" | "failed";
export type MainPushStatus = "success" | "warning" | "error" | "skipped";

export type GuardSessionLogRow = {
  id: string;
  employee_id: string | null;
  guard_name: string;
  login_status: GuardLoginStatus;
  login_at: string;
  login_error: string | null;
  main_push_processed_at: string | null;
  main_push_status: MainPushStatus | null;
  main_push_result: unknown | null;
  logout_at: string | null;
  logout_browser_push_status: string | null;
  logout_server_push_status: string | null;
  logout_session_status: string | null;
  logout_push_result: unknown | null;
  created_at: string;
  updated_at: string;
};

type SupabaseError = {
  message?: string;
};

function throwIfError(error: SupabaseError | null | undefined) {
  if (error) {
    throw new Error(error.message ?? "로그 처리 중 오류가 발생했습니다.");
  }
}

function requireLogId(id: unknown) {
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("로그 ID가 필요합니다.");
  }

  return id.trim();
}

export async function createGuardSessionLog(input: {
  employeeId?: string | null;
  guardName: unknown;
  loginStatus: GuardLoginStatus;
  loginError?: string | null;
}) {
  const guardName = typeof input.guardName === "string" && input.guardName.trim() ? input.guardName.trim() : "확인불가";
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_session_logs")
    .insert({
      employee_id: input.employeeId ?? null,
      guard_name: guardName,
      login_status: input.loginStatus,
      login_error: input.loginError ?? null,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  throwIfError(error);
  return data as GuardSessionLogRow;
}

export async function updateGuardSessionMainPushLog(input: {
  id: unknown;
  status: MainPushStatus;
  result: unknown;
}) {
  const id = requireLogId(input.id);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_session_logs")
    .update({
      main_push_processed_at: new Date().toISOString(),
      main_push_status: input.status,
      main_push_result: input.result,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error);
  return data as GuardSessionLogRow;
}

export async function updateGuardSessionLogoutLog(input: {
  id: unknown;
  browserPushStatus: unknown;
  serverPushStatus: unknown;
  sessionStatus: unknown;
  result: unknown;
}) {
  const id = requireLogId(input.id);
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_session_logs")
    .update({
      logout_at: new Date().toISOString(),
      logout_browser_push_status: typeof input.browserPushStatus === "string" ? input.browserPushStatus : null,
      logout_server_push_status: typeof input.serverPushStatus === "string" ? input.serverPushStatus : null,
      logout_session_status: typeof input.sessionStatus === "string" ? input.sessionStatus : null,
      logout_push_result: input.result,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  throwIfError(error);
  return data as GuardSessionLogRow;
}

export async function listGuardSessionLogs(input: {
  guardName?: string | null;
  loginStatus?: string | null;
  pushStatus?: string | null;
  limit?: number;
}) {
  const supabase = getSupabase();
  let query = supabase
    .from("guard_session_logs")
    .select("*")
    .order("login_at", { ascending: false })
    .limit(input.limit ?? 100);

  const guardName = input.guardName?.trim();
  if (guardName) {
    query = query.ilike("guard_name", `%${guardName}%`);
  }

  if (input.loginStatus === "success" || input.loginStatus === "failed") {
    query = query.eq("login_status", input.loginStatus);
  }

  if (input.pushStatus === "success" || input.pushStatus === "warning" || input.pushStatus === "error" || input.pushStatus === "skipped") {
    query = query.eq("main_push_status", input.pushStatus);
  }

  const { data, error } = await query;
  throwIfError(error);
  return (data ?? []) as GuardSessionLogRow[];
}
