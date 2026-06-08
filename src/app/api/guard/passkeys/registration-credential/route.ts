import { createGuardPasskeyRegistrationCredential } from "@/lib/guard-passkeys";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json(await createGuardPasskeyRegistrationCredential(body.employeeId));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "패스키 등록 인증 정보를 만들지 못했습니다." },
      { status: 400 },
    );
  }
}
