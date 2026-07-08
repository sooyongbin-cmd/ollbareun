import { countAdminUsers, sanitizeManagerNextPath } from "@/lib/manager-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSystemConfigContent } from "@/lib/system-configs";

const INITIAL_ADMIN_SETUP_CODE = "INITIAL_ADMIN_SETUP_CODE";

function requireTrimmedString(value: unknown, message: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }

  return value.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const setupCode = requireTrimmedString(body.setupCode, "최초 관리자 등록코드를 입력해주세요.");
    const nextPath = sanitizeManagerNextPath(typeof body.nextPath === "string" ? body.nextPath : null);
    const requestUrl = new URL(request.url);

    if ((await countAdminUsers()) > 0) {
      return Response.json({ error: "이미 등록된 관리자가 있습니다." }, { status: 409 });
    }

    const savedSetupCode = (await getSystemConfigContent(INITIAL_ADMIN_SETUP_CODE)).trim();

    if (!savedSetupCode || setupCode !== savedSetupCode) {
      return Response.json({ error: "최초 관리자 등록코드가 올바르지 않습니다." }, { status: 401 });
    }

    const redirectTo = new URL("/auth/callback", requestUrl.origin);
    redirectTo.searchParams.set("next", nextPath);
    redirectTo.searchParams.set("setup", "initial_admin");

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      throw new Error(error.message || "Google 인증을 시작하지 못했습니다.");
    }

    if (!data.url) {
      throw new Error("Google 인증 URL을 생성하지 못했습니다.");
    }

    return Response.json({ url: data.url });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "최초 관리자 등록 요청을 처리하지 못했습니다." },
      { status: 400 },
    );
  }
}
