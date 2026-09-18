import { deleteEducationResource, getEducationResourceById, updateEducationResource } from "@/lib/education-resources";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getEducationResourceErrorMessage(error: unknown, fallback: string) {
  const errorMessage = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";

  if (error instanceof Error) {
    return error.message.trim() || fallback;
  }

  return errorMessage.trim() || fallback;
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { id } = await params;
    return Response.json({ resource: await getEducationResourceById(id, getSupabaseAdmin()) });
  } catch (error) {
    return Response.json(
      { error: getEducationResourceErrorMessage(error, "교육자료 정보를 불러오지 못했습니다.") },
      { status: 404 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    return Response.json({
      resource: await updateEducationResource({
        id,
        title: body.title,
        youtubeLink: body.youtubeLink,
        durationSeconds: body.durationSeconds,
      }, supabase),
    });
  } catch (error) {
    return Response.json(
      { error: getEducationResourceErrorMessage(error, "교육자료 정보를 저장하지 못했습니다.") },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const { id } = await params;
    await deleteEducationResource(id, getSupabaseAdmin());
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: getEducationResourceErrorMessage(error, "교육자료 정보를 삭제하지 못했습니다.") },
      { status: 400 },
    );
  }
}
