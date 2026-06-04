import { loadGuardProfile } from "@/lib/guard-profile";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId");

    return Response.json(await loadGuardProfile(employeeId));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "개인프로필을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}
