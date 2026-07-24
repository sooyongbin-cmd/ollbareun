import { addAssignmentDayOff, removeAssignmentDayOff } from "@/lib/assignment-days-off";
import { getManagerUser } from "@/lib/manager-auth";

type RouteContext = {
  params: Promise<{ assignmentId: string; date: string }>;
};

async function requireManager() {
  const manager = await getManagerUser();
  if (!manager) {
    return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
  }
  return null;
}

export async function PUT(_: Request, { params }: RouteContext) {
  try {
    const unauthorized = await requireManager();
    if (unauthorized) return unauthorized;

    const { assignmentId, date } = await params;
    const dayOff = await addAssignmentDayOff(assignmentId, decodeURIComponent(date));
    return Response.json({ dayOff });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "휴무일을 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const unauthorized = await requireManager();
    if (unauthorized) return unauthorized;

    const { assignmentId, date } = await params;
    await removeAssignmentDayOff(assignmentId, decodeURIComponent(date));
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "휴무일을 해제하지 못했습니다." },
      { status: 400 },
    );
  }
}
