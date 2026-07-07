import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { countAdminUsers, createInitialSuperAdmin, sanitizeManagerNextPath } from "@/lib/manager-auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = sanitizeManagerNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/manager/auth?error=callback", requestUrl.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/manager/auth?error=callback", requestUrl.origin));
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return NextResponse.redirect(new URL("/manager/auth?error=callback", requestUrl.origin));
  }

  if ((await countAdminUsers()) === 0) {
    await createInitialSuperAdmin(userData.user);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
