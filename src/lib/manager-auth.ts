import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "./supabase-admin";
import { createSupabaseServerClient } from "./supabase-server";
import { sendAdminActivationEmail } from "./manager-security-email";
import { TEMPORARY_MANAGER_AUTH_BYPASS } from "./manager-auth-bypass";

type SupabaseAuthReader = {
  auth: {
    getUser: () => Promise<{
      data: { user: User | null };
      error: Error | null;
    }>;
  };
};

type AdminUserReader = {
  from: (table: "admin_users") => {
    select: (
      columns: string,
      options?: { count: "exact"; head: true },
    ) => PromiseLike<{ count: number | null; error: { message?: string } | null }> & {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{
          data: { user_id?: string; id?: string; role: string } | null;
          error: { message?: string; code?: string } | null;
        }>;
      };
    };
    insert: (row: { user_id?: string | null; id?: string; email: string; role: "super_admin" | "admin" }) => {
      select: (columns: string) => {
        single: () => PromiseLike<{
          data: { user_id?: string | null; id?: string; role: string } | null;
          error: { message?: string } | null;
        }>;
      };
    };
    update: (row: { user_id?: string | null; first_login_at?: string; updated_at?: string }) => {
      eq: (column: string, value: string) => {
        is: (column: string, value: null) => {
          select: (columns: string) => {
            single: () => PromiseLike<{
              data: { user_id?: string | null; id?: string; role: string } | null;
              error: { message?: string } | null;
            }>;
          };
        };
        select: (columns: string) => {
          single: () => PromiseLike<{
            data: { user_id?: string | null; id?: string; role: string } | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  };
};

type AdminUserWriter = AdminUserReader;

const MANAGER_HOME_PATH = "/manager";
const MANAGER_AUTH_PATH = "/manager/auth";
const TEMPORARY_MANAGER_TEST_USER = {
  id: "temporary-manager-test-user",
  email: "manager-test@local.invalid",
  app_metadata: { provider: "temporary-test-bypass" },
  user_metadata: {},
  aud: "authenticated",
  created_at: "1970-01-01T00:00:00.000Z",
} as User;

const TEMPORARY_MANAGER_TEST_ADMIN = {
  user_id: TEMPORARY_MANAGER_TEST_USER.id,
  role: "super_admin",
};

export function sanitizeManagerNextPath(nextPath: string | null | undefined): string {
  if (!nextPath) {
    return MANAGER_HOME_PATH;
  }

  const isManagerPath = nextPath === MANAGER_HOME_PATH || nextPath.startsWith(`${MANAGER_HOME_PATH}/`);

  if (!isManagerPath || nextPath.startsWith(MANAGER_AUTH_PATH)) {
    return MANAGER_HOME_PATH;
  }

  return nextPath;
}

export function createManagerAuthRedirectUrl(nextPath: string | null | undefined = MANAGER_HOME_PATH) {
  const safeNextPath = sanitizeManagerNextPath(nextPath);

  return `${MANAGER_AUTH_PATH}?next=${encodeURIComponent(safeNextPath)}`;
}

export async function getManagerUser(supabase?: SupabaseAuthReader, adminClient?: AdminUserReader) {
  // TEMPORARY: 테스트 중에는 실제 Supabase 로그인/관리자 조회를 건너뜁니다.
  if (TEMPORARY_MANAGER_AUTH_BYPASS && !supabase && !adminClient) {
    return TEMPORARY_MANAGER_TEST_USER;
  }

  const authClient = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const adminUser = await getAdminUserByAuthUserId(data.user.id, adminClient);

  return adminUser ? data.user : null;
}

export async function requireManagerUser(nextPath = MANAGER_HOME_PATH) {
  const user = await getManagerUser();

  if (!user) {
    redirect(createManagerAuthRedirectUrl(nextPath));
  }

  return user;
}

function throwIfAdminUserError(error: { message?: string; code?: string } | null) {
  if (error) {
    throw new Error(error.message?.trim() || error.code?.trim() || "관리자 정보를 확인하지 못했습니다.");
  }
}

function isMissingUserIdColumn(error: { message?: string; code?: string } | null) {
  if (!error) {
    return false;
  }

  const message = error.message ?? "";
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    message.includes("'user_id' column") ||
    message.includes("admin_users.user_id")
  );
}

function getAdminUserReader() {
  return getSupabaseAdmin() as unknown as AdminUserReader;
}

function getAdminUserWriter() {
  return getSupabaseAdmin() as unknown as AdminUserWriter;
}

export async function countAdminUsers(adminClientInput?: AdminUserReader) {
  const adminClient = adminClientInput ?? getAdminUserReader();
  const result = await adminClient.from("admin_users").select("id", { count: "exact", head: true });

  throwIfAdminUserError(result.error);
  return result.count ?? 0;
}

export async function getAdminUserByAuthUserId(userId: string, adminClientInput?: AdminUserReader) {
  const adminClient = adminClientInput ?? getAdminUserReader();
  const query = adminClient.from("admin_users").select("user_id,role");
  const { data, error } = await query.eq("user_id", userId).maybeSingle();

  if (isMissingUserIdColumn(error)) {
    const fallbackQuery = adminClient.from("admin_users").select("id,role");
    const fallback = await fallbackQuery.eq("id", userId).maybeSingle();

    throwIfAdminUserError(fallback.error);
    return fallback.data ? { user_id: fallback.data.id, role: fallback.data.role } : null;
  }

  throwIfAdminUserError(error);
  return data;
}

export async function createInitialSuperAdmin(
  user: Pick<User, "id" | "email">,
  adminClientInput?: AdminUserWriter,
) {
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    throw new Error("최초 관리자 이메일을 확인하지 못했습니다.");
  }

  const adminClient = adminClientInput ?? getAdminUserWriter();
  const { data, error } = await adminClient
    .from("admin_users")
    .insert({
      user_id: user.id,
      email,
      role: "super_admin",
    })
    .select("user_id,role")
    .single();

  if (isMissingUserIdColumn(error)) {
    const fallback = await adminClient
      .from("admin_users")
      .insert({
        id: user.id,
        email,
        role: "super_admin",
      })
      .select("id,role")
      .single();

    throwIfAdminUserError(fallback.error);
    return fallback.data;
  }

  throwIfAdminUserError(error);
  return data;
}

export async function getAdminUserByEmail(email: string, adminClientInput?: AdminUserReader) {
  if (!email?.trim()) return null;
  const adminClient = adminClientInput ?? getAdminUserReader();
  const query = adminClient.from("admin_users").select("user_id,role");
  const { data, error } = await query.eq("email", email.trim().toLowerCase()).maybeSingle();

  throwIfAdminUserError(error);
  return data;
}

export async function linkPreapprovedAdminUser(
  user: Pick<User, "id" | "email">,
  adminClientInput?: AdminUserWriter,
) {
  const email = user.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("관리자 이메일을 확인할 수 없습니다.");
  }

  const adminClient = adminClientInput ?? getAdminUserWriter();
  const { data: adminRow, error: findError } = await adminClient
    .from("admin_users")
    .select("user_id,role")
    .eq("email", email)
    .maybeSingle();

  throwIfAdminUserError(findError);

  if (adminRow && !adminRow.user_id) {
    const now = new Date().toISOString();
    const { data: updatedRow, error: updateError } = await adminClient
      .from("admin_users")
      .update({
        user_id: user.id,
        first_login_at: now,
        updated_at: now,
      })
      .eq("email", email)
      .is("user_id", null)
      .select("user_id,role")
      .single();

    throwIfAdminUserError(updateError);

    try {
      await sendAdminActivationEmail(email);
    } catch (e) {
      console.warn("관리자 계정 활성화 알림 발송 실패:", e);
    }

    return updatedRow;
  }

  return null;
}

export async function getManagerUserWithRole(supabase?: SupabaseAuthReader, adminClient?: AdminUserReader) {
  // TEMPORARY: 테스트 중에는 관리자 API도 최고 관리자 권한으로 사용할 수 있게 합니다.
  if (TEMPORARY_MANAGER_AUTH_BYPASS && !supabase && !adminClient) {
    return {
      user: TEMPORARY_MANAGER_TEST_USER,
      adminUser: TEMPORARY_MANAGER_TEST_ADMIN,
    };
  }

  const authClient = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const adminUser = await getAdminUserByAuthUserId(data.user.id, adminClient);
  if (!adminUser) {
    return null;
  }

  return {
    user: data.user,
    adminUser,
  };
}

export async function requireSuperAdminUser(nextPath = MANAGER_HOME_PATH) {
  const result = await getManagerUserWithRole();

  if (!result || result.adminUser.role !== "super_admin") {
    redirect(createManagerAuthRedirectUrl(nextPath));
  }

  return result.user;
}
