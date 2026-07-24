import { getSupabaseAdmin } from "./supabase-admin";

export class InactiveEmployeeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InactiveEmployeeError";
  }
}

function requireEmployeeId(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InactiveEmployeeError("직원 정보를 확인할 수 없습니다.");
  }

  return value.trim();
}

export async function requireActiveEmployee(employeeIdInput: unknown) {
  const employeeId = requireEmployeeId(employeeIdInput);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .select("id,is_retired")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message?.trim() || "직원 상태를 확인하지 못했습니다.");
  }

  if (!data) {
    throw new InactiveEmployeeError("등록된 직원 정보를 찾을 수 없습니다.");
  }

  if (data.is_retired) {
    throw new InactiveEmployeeError("퇴직 처리된 직원은 이용할 수 없습니다.");
  }

  return { id: data.id as string };
}

export function getActiveEmployeeErrorStatus(error: unknown, fallbackStatus: number) {
  return error instanceof InactiveEmployeeError ? 403 : fallbackStatus;
}
