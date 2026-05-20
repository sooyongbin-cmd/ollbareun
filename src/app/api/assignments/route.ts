import { createAssignment } from "@/lib/phase1-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ assignment: await createAssignment(body) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근무지를 배정하지 못했습니다." },
      { status: 400 },
    );
  }
}
