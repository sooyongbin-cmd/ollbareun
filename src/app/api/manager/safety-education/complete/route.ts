import { getManagerUser } from "@/lib/manager-auth";
import { educationTypeLabels, requireEducationType } from "@/lib/education-periods";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ExistingCompletion = { title: string; completed_at: string | null };

export async function POST(request: Request) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const body = await request.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId : "";
    const yearMonth = typeof body.yearMonth === "string" ? body.yearMonth : "";
    const workDate = typeof body.workDate === "string" ? body.workDate : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)) {
      return Response.json({ error: "근무자 정보를 확인하세요." }, { status: 400 });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      return Response.json({ error: "조회 년월을 확인하세요." }, { status: 400 });
    }
    const parsedWorkDate = new Date(`${workDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)
      || !Number.isFinite(parsedWorkDate.getTime())
      || parsedWorkDate.toISOString().slice(0, 10) !== workDate
      || workDate.slice(0, 7) !== yearMonth) {
      return Response.json({ error: "출근일을 확인하세요." }, { status: 400 });
    }
    const educationType = requireEducationType(body.educationType);
    const educationTypeLabel = educationTypeLabels[educationType];
    const supabase = getSupabaseAdmin();
    const monthStart = `${yearMonth}-01`;
    const [year, month] = yearMonth.split("-").map(Number);
    const nextMonth = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);

    let resourceQuery = supabase
      .from("education_resources")
      .select("title,startdate,enddate")
      .eq("education_type", educationTypeLabel);
    resourceQuery = educationType === "daily"
      ? resourceQuery.lte("startdate", workDate).gte("enddate", workDate)
      : resourceQuery.lt("startdate", nextMonth).gte("enddate", monthStart);
    if (body.resourceId !== undefined) {
      if (typeof body.resourceId !== "string" || !body.resourceId.trim()) return Response.json({ error: "교육자료를 확인하세요." }, { status: 400 });
      resourceQuery = resourceQuery.eq("id", body.resourceId);
    }
    const { data: resources, error: resourceError } = await resourceQuery;
    if (resourceError) throw new Error(resourceError.message);
    const titles = [...new Set((resources ?? []).map((resource) => resource.title).filter(Boolean))];
    if (!titles.length) {
      return Response.json({ error: `${educationTypeLabel} 교육자료가 등록되어 있지 않습니다.` }, { status: 400 });
    }

    let existingQuery = supabase
      .from("education_completions")
      .select("title,completed_at")
      .eq("employee_id", employeeId)
      .eq("education_type", educationTypeLabel)
      .in("title", titles);
    existingQuery = educationType === "daily" ? existingQuery.eq("work_date", workDate)
      : existingQuery.gte("work_date", monthStart).lt("work_date", nextMonth);
    const { data: existingRows, error: completionError } = await existingQuery;
    if (completionError) throw new Error(completionError.message);

    const existingByTitle = new Map<string, ExistingCompletion>();
    (existingRows ?? []).forEach((row) => {
      const completion = row as ExistingCompletion;
      const current = existingByTitle.get(completion.title);
      if (!current || (!current.completed_at && completion.completed_at)) {
        existingByTitle.set(completion.title, completion);
      }
    });

    const completedAt = new Date().toISOString();
    const titlesToInsert: string[] = [];
    for (const title of titles) {
      const existing = existingByTitle.get(title);
      if (!existing) {
        titlesToInsert.push(title);
      } else if (!existing.completed_at) {
        let updateQuery = supabase.from("education_completions")
          .update({ completed_at: completedAt })
          .eq("employee_id", employeeId)
          .eq("education_type", educationTypeLabel)
          .eq("title", title)
          .is("completed_at", null);
        updateQuery = educationType === "daily" ? updateQuery.eq("work_date", workDate)
          : updateQuery.gte("work_date", monthStart).lt("work_date", nextMonth);
        const { error } = await updateQuery;
        if (error) throw new Error(error.message);
      }
    }

    if (titlesToInsert.length) {
      const { error } = await supabase.from("education_completions").insert(titlesToInsert.map((title) => ({
        employee_id: employeeId,
        title,
        education_type: educationTypeLabel,
        work_date: educationType === "daily" ? workDate : (resources ?? []).find((resource) => resource.title === title)!.startdate > monthStart
          ? (resources ?? []).find((resource) => resource.title === title)!.startdate : monthStart,
        completed_at: completedAt,
      })));
      if (error) throw new Error(error.message);
    }

    return Response.json({ workDate, completedCount: titles.length });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수 처리에 실패했습니다." },
      { status: 400 },
    );
  }
}
