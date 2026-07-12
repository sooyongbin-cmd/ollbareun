import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  countAdminUsers,
  createInitialSuperAdmin,
  sanitizeManagerNextPath,
  getAdminUserByAuthUserId,
  getAdminUserByEmail,
  linkPreapprovedAdminUser,
} from "@/lib/manager-auth";

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

  const user = userData.user;

  if (isInitialAdminSetup && (await countAdminUsers()) === 0) {
    await createInitialSuperAdmin(user);
    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  // 1. Look up by user_id
  const adminByUserId = await getAdminUserByAuthUserId(user.id).catch(() => null);
  if (adminByUserId) {
    return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  }

  // 2. Look up by email
  const email = user.email?.trim().toLowerCase();
  if (email) {
    const adminByEmail = await getAdminUserByEmail(email).catch(() => null);
    if (adminByEmail && !adminByEmail.user_id) {
      await linkPreapprovedAdminUser(user);
      return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
    }
  }

  // Not registered as admin, sign out to clear session
  await supabase.auth.signOut();

  const redirectUrl = new URL("/manager/auth?error=unauthorized", requestUrl.origin);
  if (email) {
    redirectUrl.searchParams.set("email", email);
  }

  return NextResponse.redirect(redirectUrl);
}
