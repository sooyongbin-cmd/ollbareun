import { ensureAttendanceEducation } from "@/lib/attendance-education";
import { parseEducationFilters } from "@/lib/education-completions";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const batchSize = 25;

export async function POST(request: Request) {
  if (!(await getManagerUser())) {
    return Response.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.from !== "string" || !body.from.trim()
    || typeof body?.to !== "string" || !body.to.trim()
    || (body.page !== undefined && (!Number.isSafeInteger(body.page) || body.page < 1))) {
    return Response.json({ error: "출근기간과 처리 페이지를 확인하세요." }, { status: 400 });
  }

  let filters;
  try {
    filters = parseEducationFilters(new URLSearchParams({ from: body.from, to: body.to, page: String(body.page ?? 1) }));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "출근기간을 확인하세요." }, { status: 400 });
  }

  let processedCount = 0;
  try {
    const supabase = getSupabaseAdmin();
    const offset = (filters.page - 1) * batchSize;
    const { data, error } = await supabase.from("work_record")
      .select("id,employee_id,work_date")
      .not("work_intime", "is", null)
      .gte("work_date", filters.from!)
      .lte("work_date", filters.to!)
      .order("work_date", { ascending: true })
      .order("employee_id")
      .order("id")
      .range(offset, offset + batchSize);
    if (error) throw new Error("출근 기록을 불러오지 못했습니다.");

    const rows = data ?? [];
    // Process in date order so period-based education is assigned to the first attendance date.
    for (const row of rows.slice(0, batchSize)) {
      await ensureAttendanceEducation(supabase, row.employee_id, row.work_date);
      processedCount += 1;
    }
    return Response.json({ processedCount, hasMore: rows.length > batchSize, nextPage: filters.page + 1 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "안전교육이수자료 생성에 실패했습니다.",
      processedCount,
    }, { status: 500 });
  }
}
