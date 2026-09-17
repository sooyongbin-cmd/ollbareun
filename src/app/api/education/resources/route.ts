import { createEducationResource, listEducationResources } from "@/lib/education-resources";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function getEducationResourceErrorMessage(error: unknown, fallback: string) {
  const errorName = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  const errorMessage = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";

  if (errorName === "AbortError" || errorMessage.includes("AbortError") || errorMessage.includes("aborted")) {
    return "Supabase 응답 시간이 초과되었습니다. 네트워크 상태와 테이블 생성 여부를 확인하세요.";
  }

  if (error instanceof Error) {
    return error.message.trim() || fallback;
  }

  return fallback;
}

export async function GET() {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    return Response.json({ resources: await listEducationResources(getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: getEducationResourceErrorMessage(error, "교육자료 목록을 불러오지 못했습니다.") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const formData = await request.formData();
    const supabase = getSupabaseAdmin();
    return Response.json({
      resource: await createEducationResource({
        title: formData.get("title"),
        youtubeLink: formData.get("youtubeLink"),
      }, supabase),
    });
  } catch (error) {
    return Response.json(
      { error: getEducationResourceErrorMessage(error, "교재를 저장하지 못했습니다.") },
      { status: 400 },
    );
  }
}
