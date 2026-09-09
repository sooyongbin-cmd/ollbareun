import { getManagerUser } from "@/lib/manager-auth";
import { createAssignment, listAssignments } from "@/lib/phase1-data";

export async function GET() {
  try {
    return Response.json({ assignments: await listAssignments() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "배정 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const body = await request.json();
    return Response.json({ assignment: await createAssignment(body) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근무지를 배정하지 못했습니다." },
      { status: 400 },
    );
  }
}
