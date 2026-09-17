import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { holidayDate, holidayName, holidayYear, insertHolidays } from "@/lib/public-holidays";

export async function GET(request: Request) {
  if (!(await getManagerUser())) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const year = holidayYear(new URL(request.url).searchParams.get("year"));
    const { data, error } = await getSupabaseAdmin().from("public_holidays").select("id,holiday_date,name,selected")
      .gte("holiday_date", year + "-01-01").lt("holiday_date", String(Number(year) + 1) + "-01-01").order("holiday_date");
    if (error) throw new Error("공휴일을 조회하지 못했습니다.");
    return Response.json({ holidays: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (!(await getManagerUser())) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json();
    const inserted = await insertHolidays([{ holiday_date: holidayDate(body.holiday_date), name: holidayName(body.name), selected: "Y" }]);
    if (!inserted) return Response.json({ error: "이미 등록된 날짜입니다." }, { status: 409 });
    return Response.json({ inserted }, { status: 201 });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: Request) {
  if (!(await getManagerUser())) return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json();
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || !["Y", "N"].includes(body.selected)) throw new Error("선택값이 올바르지 않습니다.");
    const { data, error } = await getSupabaseAdmin().from("public_holidays").update({ selected: body.selected }).eq("id", body.id).select("id").maybeSingle();
    if (error) throw new Error("선택값을 저장하지 못했습니다.");
    if (!data) return Response.json({ error: "휴일을 찾을 수 없습니다." }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) { return failure(error); }
}
function failure(error: unknown) {
  return Response.json({ error: error instanceof Error ? error.message : "요청을 처리하지 못했습니다." }, { status: 400 });
}
