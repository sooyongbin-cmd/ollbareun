import { completeGuardPasskeyRegistration } from "@/lib/guard-passkeys";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ request: await completeGuardPasskeyRegistration(body.employeeId) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "패스키 등록 완료 처리를 하지 못했습니다." },
      { status: 400 },
    );
  }
}
