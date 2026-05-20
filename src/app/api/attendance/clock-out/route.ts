import { clockOut } from "@/lib/phase1-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ attendance: await clockOut(body) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "퇴근 처리에 실패했습니다." },
      { status: 400 },
    );
  }
}
