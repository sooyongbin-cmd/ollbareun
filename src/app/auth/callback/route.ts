import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { countAdminUsers, createInitialSuperAdmin, sanitizeManagerNextPath } from "@/lib/manager-auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeManagerNextPath(requestUrl.searchParams.get("next"));
  const isInitialAdminSetup = requestUrl.searchParams.get("setup") === "initial_admin";

  if (!code) {
    return NextResponse.redirect(new URL("/manager/auth?error=callback", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/manager/auth?error=callback", requestUrl.origin));
  }

  const exchangedUser = sessionData?.user ?? null;
  const { data: userData, error: userError } = exchangedUser
    ? { data: { user: exchangedUser }, error: null }
    : await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.redirect(new URL("/manager/auth?error=callback", requestUrl.origin));
  }

  if (isInitialAdminSetup && (await countAdminUsers()) === 0) {
    await createInitialSuperAdmin(userData.user);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
