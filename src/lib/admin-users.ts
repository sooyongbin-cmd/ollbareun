import { getSupabaseAdmin } from "./supabase-admin";
import { sendAdminPreRegistrationEmail } from "./manager-security-email";

export type AdminUserRow = {
  id: string;
  user_id: string | null;
  email: string;
  role: "admin" | "super_admin";
  created_by: string | null;
  first_login_at: string | null;
  created_at: string;
  updated_at: string;
};

function throwIfAdminError(error: { message?: string } | null) {
  if (error) {
    throw new Error(error.message || "관리자 데이터 처리 중 오류가 발생했습니다.");
  }
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, user_id, email, role, created_by, first_login_at, created_at, updated_at")
    .order("created_at", { ascending: false });

  throwIfAdminError(error);
  return (data ?? []) as AdminUserRow[];
}

export async function registerAdminUser(
  emailInput: string,
  roleInput: "admin" | "super_admin" = "admin",
  createdByUserId: string | null = null,
): Promise<AdminUserRow> {
  const email = emailInput.trim().toLowerCase();
  if (!email) {
    throw new Error("관리자 이메일을 입력해주세요.");
  }
  if (roleInput !== "admin" && roleInput !== "super_admin") {
    const err = new Error("올바르지 않은 직군입니다.") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const supabase = getSupabaseAdmin();

  // Check duplicate email
  const { data: existing } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    const err = new Error("이미 등록된 관리자 이메일입니다.") as Error & { status?: number };
    err.status = 409;
    throw err;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      email,
      role: roleInput,
      created_by: createdByUserId,
    })
    .select("id, user_id, email, role, created_by, first_login_at, created_at, updated_at")
    .single();

  throwIfAdminError(error);

  try {
    await sendAdminPreRegistrationEmail(email);
  } catch (e) {
    console.warn("관리자 사전 등록 보안 알림 발송 실패:", e);
  }

  return data as AdminUserRow;
}

export async function updateAdminUserRole(
  id: string,
  newRole: "admin" | "super_admin",
): Promise<AdminUserRow> {
  const supabase = getSupabaseAdmin();

  // Find target user
  const { data: targetUser, error: findError } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("id", id)
    .single();

  throwIfAdminError(findError);
  if (!targetUser) {
    throw new Error("해당 관리자를 찾을 수 없습니다.");
  }

  // Last super_admin protection
  if (targetUser.role === "super_admin" && newRole !== "super_admin") {
    const { count, error: countError } = await supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");

    throwIfAdminError(countError);

    if ((count ?? 0) <= 1) {
      const err = new Error("시스템의 마지막 최고 관리자 권한은 변경할 수 없습니다.") as Error & { status?: number };
      err.status = 400;
      throw err;
    }
  }

  const { data, error } = await supabase
    .from("admin_users")
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, user_id, email, role, created_by, first_login_at, created_at, updated_at")
    .single();

  throwIfAdminError(error);
  return data as AdminUserRow;
}

export async function deleteAdminUser(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Find target user
  const { data: targetUser, error: findError } = await supabase
    .from("admin_users")
    .select("id, role")
    .eq("id", id)
    .single();

  throwIfAdminError(findError);
  if (!targetUser) {
    throw new Error("해당 관리자를 찾을 수 없습니다.");
  }

  // Last super_admin protection
  if (targetUser.role === "super_admin") {
    const { count, error: countError } = await supabase
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin");

    throwIfAdminError(countError);

    if ((count ?? 0) <= 1) {
      const err = new Error("시스템의 마지막 최고 관리자는 삭제할 수 없습니다.") as Error & { status?: number };
      err.status = 400;
      throw err;
    }
  }

  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  throwIfAdminError(error);
}
