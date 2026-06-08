import { createGuardPasskeyRequest } from "@/lib/guard-passkeys";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const passkeyRequest = await createGuardPasskeyRequest(body.employeeId);
    return Response.json({ request: passkeyRequest });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "패스키 등록 요청을 처리하지 못했습니다." },
      { status: 400 },
    );
  }
}
