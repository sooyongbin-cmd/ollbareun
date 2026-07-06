import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

type SupabaseAuthReader = {
  auth: {
    getUser: () => Promise<{
      data: { user: User | null };
      error: Error | null;
    }>;
  };
};

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

export async function getManagerUser(supabase?: SupabaseAuthReader) {
  const authClient = supabase ?? (await createSupabaseServerClient());
  const { data, error } = await authClient.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function requireManagerUser(nextPath = MANAGER_HOME_PATH) {
  const user = await getManagerUser();

  if (!user) {
    redirect(createManagerAuthRedirectUrl(nextPath));
  }

  return user;
}
