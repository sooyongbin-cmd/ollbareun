import { deleteEmployee, getEmployeeById, updateEmployee } from "@/lib/phase1-data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    return Response.json({ employee: await getEmployeeById(id) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직원 정보를 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    return Response.json({
      employee: await updateEmployee({
        id,
        name: body.name,
        phone: body.phone,
        is_retired: body.is_retired,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직원 정보를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    await deleteEmployee(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직원 정보를 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
