import type { SupabaseClient } from "@supabase/supabase-js";

export const employeeRolesSystemCode = "employees_role";

export function parseEmployeeRoles(content: unknown) {
  if (typeof content !== "string") return [];

  return Array.from(new Set(
    content
      .split(/\r?\n/)
      .map((role) => role.trim())
      .filter(Boolean),
  ));
}

export async function loadEmployeeRoles(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("system_configs")
    .select("content")
    .eq("system_code", employeeRolesSystemCode)
    .single();

  if (error) throw new Error(error.message);

  const roles = parseEmployeeRoles(data?.content);
  if (roles.length === 0) {
    throw new Error("직군 시스템설정에 한 개 이상의 직군을 등록하세요.");
  }

  return roles;
}

export async function fetchEmployeeRoles() {
  const response = await fetch("/api/employee-roles");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "직군 목록을 불러오지 못했습니다.");
  }

  return payload.roles as string[];
}
