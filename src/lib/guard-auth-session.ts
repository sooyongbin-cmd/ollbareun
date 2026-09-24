import { createHash, randomBytes } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loadGuardSessionByEmployeeId } from "@/lib/phase1-data";

const COOKIE_NAME = "ollbareun_guard_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export class GuardAuthenticationError extends Error {
  status = 401;

  constructor(message = "근무자 인증이 필요합니다.") {
    super(message);
    this.name = "GuardAuthenticationError";
  }
}

export class GuardAuthorizationError extends Error {
  status = 403;

  constructor(message = "요청 권한이 없습니다.") {
    super(message);
    this.name = "GuardAuthorizationError";
  }
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookie(token: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function readCookie(request: Request) {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  const entry = cookies.map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return entry?.slice(COOKIE_NAME.length + 1) || null;
}

export async function createGuardAuthSession(employeeId: string) {
  const token = randomBytes(32).toString("base64url");
  const admin = getSupabaseAdmin();
  const { error: cleanupError } = await admin
    .from("guard_auth_sessions")
    .delete()
    .or(`expires_at.lte.${new Date().toISOString()},revoked_at.not.is.null`);
  if (cleanupError) throw new Error(cleanupError.message || "만료된 근무자 세션을 정리하지 못했습니다.");
  const { error } = await admin.from("guard_auth_sessions").insert({
    employee_id: employeeId,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) throw new Error(error.message || "근무자 세션을 생성하지 못했습니다.");
  return { token, setCookie: cookie(token, SESSION_TTL_SECONDS) };
}

export async function requireGuardEmployee(request: Request, claimedEmployeeId?: unknown) {
  const token = readCookie(request);
  if (!token) throw new GuardAuthenticationError();

  const admin = getSupabaseAdmin();
  const { data: session, error: sessionError } = await admin
    .from("guard_auth_sessions")
    .select("employee_id")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (sessionError) throw new Error(sessionError.message || "근무자 세션을 확인하지 못했습니다.");
  if (!session) throw new GuardAuthenticationError("로그인이 만료되었습니다. 다시 로그인해 주세요.");
  if (typeof claimedEmployeeId === "string" && claimedEmployeeId !== session.employee_id) {
    throw new GuardAuthorizationError("로그인한 근무자 정보와 요청 정보가 일치하지 않습니다.");
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .select("id,name,role,is_retired")
    .eq("id", session.employee_id)
    .maybeSingle();
  if (employeeError) throw new Error(employeeError.message || "근무자 상태를 확인하지 못했습니다.");
  if (!employee || employee.is_retired) throw new GuardAuthorizationError("퇴직 처리된 계정은 이용할 수 없습니다.");
  return employee as { id: string; name: string; role: string; is_retired: boolean };
}

export async function requireGuardWorksite(request: Request, claimedEmployeeId?: unknown) {
  const employee = await requireGuardEmployee(request, claimedEmployeeId);
  const session = await loadGuardSessionByEmployeeId(employee.id);
  if (!session.assignment || !session.worksite) {
    throw new GuardAuthorizationError("현재 배정된 근무지가 없어 업무 보고를 등록할 수 없습니다.");
  }
  return { employee, worksite: session.worksite };
}

export async function requireGuardSessionLogOwner(request: Request, logId: string) {
  const employee = await requireGuardEmployee(request);
  const { data, error } = await getSupabaseAdmin()
    .from("guard_session_logs")
    .select("employee_id")
    .eq("id", logId)
    .maybeSingle();
  if (error) throw new Error(error.message || "로그 기록 소유자를 확인하지 못했습니다.");
  if (!data || data.employee_id !== employee.id) {
    throw new GuardAuthorizationError("본인의 로그인 로그만 수정할 수 있습니다.");
  }
  return employee;
}

export async function revokeGuardAuthSession(request: Request) {
  const token = readCookie(request);
  if (token) {
    const { error } = await getSupabaseAdmin()
      .from("guard_auth_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashToken(token))
      .is("revoked_at", null);
    if (error) throw new Error(error.message || "로그아웃 처리에 실패했습니다.");
  }
}

export function clearGuardAuthCookie() {
  return cookie("", 0);
}

export function guardAuthErrorStatus(error: unknown, fallback = 500) {
  if (error instanceof GuardAuthenticationError || error instanceof GuardAuthorizationError) return error.status;
  return fallback;
}
