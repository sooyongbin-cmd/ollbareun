import { loadGuardProfile } from "@/lib/guard-profile";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employee = await requireGuardEmployee(request, url.searchParams.get("employeeId"));
    return Response.json(await loadGuardProfile(employee.id));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "개인프로필을 불러오지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}
