import { getEducationResourceById, updateEducationResource } from "@/lib/education-resources";

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
    const { id } = await params;
    return Response.json({ resource: await getEducationResourceById(id) });
  } catch (error) {
    return Response.json(
      { error: getEducationResourceErrorMessage(error, "교육자료 정보를 불러오지 못했습니다.") },
      { status: 404 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    return Response.json({
      resource: await updateEducationResource({
        id,
        title: body.title,
        youtubeLink: body.youtubeLink,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: getEducationResourceErrorMessage(error, "교육자료 정보를 저장하지 못했습니다.") },
      { status: 400 },
    );
  }
}
