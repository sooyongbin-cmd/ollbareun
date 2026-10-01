import { getManagerUser } from "@/lib/manager-auth";

// Older open pages may still call this endpoint. Never generate pending records.
export async function POST() {
  if (!(await getManagerUser())) {
    return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }
  return Response.json({ error: "안전교육 이수자료는 교육 이수 시에만 생성됩니다." }, { status: 410 });
}
