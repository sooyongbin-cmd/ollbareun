import { randomBytes } from "crypto";
import { loadGuardSessionByEmployeeId } from "./phase1-data";
import { getSupabase } from "./supabase";
import { getSupabaseAdmin } from "./supabase-admin";

type SupabaseError = { message?: string; code?: string } | null | undefined;

type EmployeeForPasskey = {
  id: string;
  name: string;
  phone: string;
  is_retired: boolean;
  auth_user_id?: string | null;
};

type GuardPasskeyRequestRow = {
  id: string;
  employee_id: string;
  status: "pending" | "approved" | "rejected" | "registered" | "revoked";
  requested_at?: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  registered_at?: string | null;
  revoked_at?: string | null;
  employees?: EmployeeForPasskey | EmployeeForPasskey[] | null;
};

export type GuardPasskeyRequestSummary = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhone: string;
  employeeRetired: boolean;
  status: GuardPasskeyRequestRow["status"];
  requestedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  registeredAt: string | null;
  revokedAt: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function throwIfError(error: SupabaseError, fallback = "패스키 요청을 처리하지 못했습니다.") {
  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 처리 대기 중인 패스키 요청이 있습니다.");
    }
    throw new Error(error.message ?? fallback);
  }
}

function requireId(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} 정보가 올바르지 않습니다.`);
  }

  return value.trim();
}

function getJoinedEmployee(row: GuardPasskeyRequestRow) {
  const joined = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  return joined ?? null;
}

function toSummary(row: GuardPasskeyRequestRow): GuardPasskeyRequestSummary {
  const employee = getJoinedEmployee(row);

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: employee?.name ?? "-",
    employeePhone: employee?.phone ?? "-",
    employeeRetired: Boolean(employee?.is_retired),
    status: row.status,
    requestedAt: row.requested_at ?? null,
    reviewedAt: row.reviewed_at ?? null,
    reviewedBy: row.reviewed_by ?? null,
    registeredAt: row.registered_at ?? null,
    revokedAt: row.revoked_at ?? null,
  };
}

function createSyntheticGuardEmail(employeeId: string) {
  return `guard-${employeeId}@ollbareun-passkey.local`;
}

function createTemporaryPassword() {
  return randomBytes(24).toString("base64url");
}

async function loadEmployeeForPasskey(employeeId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("employees")
    .select("id,name,phone,is_retired,auth_user_id")
    .eq("id", employeeId)
    .maybeSingle();

  throwIfError(error, "경비원 정보를 확인하지 못했습니다.");
  if (!data) {
    throw new Error("등록된 경비원 정보를 찾을 수 없습니다.");
  }

  return data as EmployeeForPasskey;
}

export async function createGuardPasskeyRequest(employeeIdInput: unknown) {
  const employeeId = requireId(employeeIdInput, "경비원");
  const employee = await loadEmployeeForPasskey(employeeId);

  if (employee.is_retired) {
    throw new Error("퇴직 처리된 경비원은 패스키를 요청할 수 없습니다.");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_passkey_requests")
    .insert({ employee_id: employeeId })
    .select("*")
    .single();

  throwIfError(error);
  return data as GuardPasskeyRequestRow;
}

export async function loadGuardPasskeyRequestForEmployee(employeeIdInput: unknown) {
  const employeeId = requireId(employeeIdInput, "경비원");
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_passkey_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  return (data ?? null) as GuardPasskeyRequestRow | null;
}

export async function listGuardPasskeyRequests() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_passkey_requests")
    .select("*, employees(name,phone,is_retired)")
    .order("requested_at", { ascending: false });

  throwIfError(error, "패스키 요청 목록을 불러오지 못했습니다.");
  return ((data ?? []) as GuardPasskeyRequestRow[]).map(toSummary);
}

async function updateGuardPasskeyRequestStatus(
  requestIdInput: unknown,
  status: "approved" | "rejected",
  reviewedByInput: unknown,
) {
  const requestId = requireId(requestIdInput, "요청");
  const reviewedBy = typeof reviewedByInput === "string" && reviewedByInput.trim() ? reviewedByInput.trim() : "manager";
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_passkey_requests")
    .update({
      status,
      reviewed_at: nowIso(),
      reviewed_by: reviewedBy,
      updated_at: nowIso(),
    })
    .eq("id", requestId)
    .select("*")
    .single();

  throwIfError(error);
  return data as GuardPasskeyRequestRow;
}

export function approveGuardPasskeyRequest(requestId: unknown, reviewedBy?: unknown) {
  return updateGuardPasskeyRequestStatus(requestId, "approved", reviewedBy);
}

export function rejectGuardPasskeyRequest(requestId: unknown, reviewedBy?: unknown) {
  return updateGuardPasskeyRequestStatus(requestId, "rejected", reviewedBy);
}

export async function revokeGuardPasskey(requestIdInput: unknown, reviewedByInput?: unknown) {
  const requestId = requireId(requestIdInput, "요청");
  const reviewedBy = typeof reviewedByInput === "string" && reviewedByInput.trim() ? reviewedByInput.trim() : "manager";
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_passkey_requests")
    .update({
      status: "revoked",
      reviewed_at: nowIso(),
      reviewed_by: reviewedBy,
      revoked_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", requestId)
    .select("*")
    .single();

  throwIfError(error);
  const row = data as GuardPasskeyRequestRow;

  const employeeResult = await supabase
    .from("employees")
    .update({
      auth_user_id: null,
      passkey_enabled: false,
    })
    .eq("id", row.employee_id)
    .select("id")
    .single();

  throwIfError(employeeResult.error);
  return row;
}

async function loadApprovedRequestWithEmployee(employeeId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("guard_passkey_requests")
    .select("*, employees(name,phone,is_retired,auth_user_id)")
    .eq("employee_id", employeeId)
    .in("status", ["approved", "registered"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  if (!data) {
    throw new Error("승인된 패스키 등록 요청이 없습니다.");
  }

  return data as GuardPasskeyRequestRow;
}

export async function createGuardPasskeyRegistrationCredential(employeeIdInput: unknown) {
  const employeeId = requireId(employeeIdInput, "경비원");
  const request = await loadApprovedRequestWithEmployee(employeeId);
  const employee = getJoinedEmployee(request);

  if (!employee || employee.is_retired) {
    throw new Error("패스키를 등록할 수 있는 경비원 정보가 없습니다.");
  }

  if (request.status !== "approved") {
    throw new Error("이미 등록이 완료되었거나 승인 상태가 아닙니다.");
  }

  const admin = getSupabaseAdmin();
  const email = createSyntheticGuardEmail(employeeId);
  const password = createTemporaryPassword();
  let authUserId = employee.auth_user_id ?? null;

  if (!authUserId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        guard_employee_id: employeeId,
        guard_name: employee.name,
      },
    });

    throwIfError(error, "패스키 등록 계정을 만들지 못했습니다.");
    authUserId = data.user?.id ?? null;
    if (!authUserId) {
      throw new Error("패스키 등록 계정 ID를 확인하지 못했습니다.");
    }

    const supabase = getSupabase();
    const updateResult = await supabase
      .from("employees")
      .update({ auth_user_id: authUserId })
      .eq("id", employeeId)
      .select("id")
      .single();
    throwIfError(updateResult.error, "경비원 계정 연결을 저장하지 못했습니다.");
  } else {
    const { error } = await admin.auth.admin.updateUserById(authUserId, { password });
    throwIfError(error, "패스키 등록 임시 비밀번호를 갱신하지 못했습니다.");
  }

  return { email, password };
}

export async function completeGuardPasskeyRegistration(employeeIdInput: unknown) {
  const employeeId = requireId(employeeIdInput, "경비원");
  const request = await loadApprovedRequestWithEmployee(employeeId);
  const employee = getJoinedEmployee(request);

  if (!employee?.auth_user_id) {
    throw new Error("패스키 등록 계정이 연결되지 않았습니다.");
  }

  const admin = getSupabaseAdmin();
  const { error: rotateError } = await admin.auth.admin.updateUserById(employee.auth_user_id, {
    password: createTemporaryPassword(),
  });
  throwIfError(rotateError, "임시 등록 비밀번호를 회전하지 못했습니다.");

  const supabase = getSupabase();
  const [requestResult, employeeResult] = await Promise.all([
    supabase
      .from("guard_passkey_requests")
      .update({
        status: "registered",
        registered_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", request.id)
      .select("*")
      .single(),
    supabase
      .from("employees")
      .update({ passkey_enabled: true })
      .eq("id", employeeId)
      .select("id")
      .single(),
  ]);

  throwIfError(requestResult.error);
  throwIfError(employeeResult.error);
  return requestResult.data as GuardPasskeyRequestRow;
}

export async function createGuardSessionFromAuthToken(accessTokenInput: unknown) {
  const accessToken = requireId(accessTokenInput, "인증 토큰");
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(accessToken);

  throwIfError(error, "패스키 로그인 사용자를 확인하지 못했습니다.");
  const authUserId = data.user?.id;
  if (!authUserId) {
    throw new Error("패스키 로그인 사용자를 확인하지 못했습니다.");
  }

  const supabase = getSupabase();
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("auth_user_id", authUserId)
    .eq("passkey_enabled", true)
    .maybeSingle();

  throwIfError(employeeError, "패스키와 연결된 경비원 정보를 확인하지 못했습니다.");
  if (!employee) {
    throw new Error("패스키와 연결된 경비원 정보를 찾을 수 없습니다.");
  }

  return loadGuardSessionByEmployeeId(employee.id);
}
