import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "./supabase-admin";
import { createSupabaseServerClient } from "./supabase-server";

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
    insert: (row: { user_id?: string; id?: string; email: string; role: "super_admin" }) => {
      select: (columns: string) => {
        single: () => PromiseLike<{
          data: { user_id?: string; id?: string; role: string } | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
};

type AdminUserWriter = AdminUserReader;

const MANAGER_HOME_PATH = "/manager";
const MANAGER_AUTH_PATH = "/manager/auth";

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
  if (!user.email?.trim()) {
    throw new Error("최초 관리자 이메일을 확인하지 못했습니다.");
  }

  const adminClient = adminClientInput ?? getAdminUserWriter();
  const { data, error } = await adminClient
    .from("admin_users")
    .insert({
      user_id: user.id,
      email: user.email.trim(),
      role: "super_admin",
    })
    .select("user_id,role")
    .single();

  if (isMissingUserIdColumn(error)) {
    const fallback = await adminClient
      .from("admin_users")
      .insert({
        id: user.id,
        email: user.email.trim(),
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
