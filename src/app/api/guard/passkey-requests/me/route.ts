import { loadGuardPasskeyRequestForEmployee } from "@/lib/guard-passkeys";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const passkeyRequest = await loadGuardPasskeyRequestForEmployee(url.searchParams.get("employeeId"));
    return Response.json({ request: passkeyRequest });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "패스키 요청 상태를 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}
