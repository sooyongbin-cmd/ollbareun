import { authenticateGuard } from "@/lib/phase1-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await authenticateGuard(body));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "경비원 인증에 실패했습니다." },
      { status: 401 },
    );
  }
}
