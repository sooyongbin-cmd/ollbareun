import { deleteAssignment, getAssignmentById, updateAssignment } from "@/lib/phase1-data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    return Response.json({ assignment: await getAssignmentById(id) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "배정 정보를 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    return Response.json({
      assignment: await updateAssignment({
        id,
        employeeId: body.employeeId,
        worksiteId: body.worksiteId,
        workDate: body.workDate,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "배정을 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await deleteAssignment(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "배정을 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
