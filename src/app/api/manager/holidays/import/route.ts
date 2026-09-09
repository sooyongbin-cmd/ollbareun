import { getManagerUser } from "@/lib/manager-auth";
import { importHolidays } from "@/lib/public-holidays";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!(await getManagerUser())) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json();
    return Response.json(await importHolidays(body.year));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "공휴일을 가져오지 못했습니다." }, { status: 400 });
  }
}
