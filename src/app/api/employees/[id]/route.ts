import { deleteEmployee, getEmployeeById, listAssignmentsForEmployee, updateEmployee } from "@/lib/phase1-data";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function throwIfQueryError(error: { message?: string } | null | undefined) {
  if (error) {
    throw new Error(error.message ?? "직원 관련 자료를 불러오지 못했습니다.");
  }
}

export async function GET(_: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const [employee, assignments, educationCompletionsResult, educationResourcesResult, workRecordsResult, leavesResult, inspectionLogsResult, specialRemarksResult, worksitesResult] = await Promise.all([
      getEmployeeById(id, supabase),
      listAssignmentsForEmployee(id, supabase),
      supabase
        .from("education_completions")
        .select("resource_id,is_completed,completed_at")
        .eq("employee_id", id),
      supabase.from("education_resources").select("id,title"),
      supabase
        .from("work_record")
        .select("id,work_date,worksite_id,intime,outtime,intime_status,work_intime,work_outtime")
        .eq("employee_id", id)
        .order("work_date", { ascending: false }),
      supabase
        .from("leave")
        .select("id,leave_type,start_date,end_date")
        .eq("employee_id", id)
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("inspection_logs")
        .select("id,inspected_at,site_name,worksite_name")
        .eq("employee_id", id)
        .order("inspected_at", { ascending: false }),
      supabase
        .from("inspection_special_reports")
        .select("id,reported_at,content")
        .eq("employee_id", id)
        .order("reported_at", { ascending: false }),
      supabase.from("worksites").select("id,name"),
    ]);

    throwIfQueryError(educationCompletionsResult.error);
    throwIfQueryError(educationResourcesResult.error);
    throwIfQueryError(workRecordsResult.error);
    throwIfQueryError(leavesResult.error);
    throwIfQueryError(inspectionLogsResult.error);
    throwIfQueryError(specialRemarksResult.error);
    throwIfQueryError(worksitesResult.error);

    const resourceTitleById = new Map(
      (educationResourcesResult.data ?? []).map((resource) => [resource.id, resource.title]),
    );
    const worksiteNameById = new Map(
      (worksitesResult.data ?? []).map((worksite) => [worksite.id, worksite.name]),
    );
    const educationCompletions = (educationCompletionsResult.data ?? [])
      .map((completion) => ({
        resource_id: completion.resource_id,
        resource_title: resourceTitleById.get(completion.resource_id) ?? completion.resource_id,
        is_completed: completion.is_completed,
        completed_at: completion.completed_at,
      }))
      .sort((left, right) => left.resource_title.localeCompare(right.resource_title, "ko-KR"));
    const attendance = (workRecordsResult.data ?? []).map((record) => ({
      id: record.id,
      work_date: record.work_date,
      worksite_name: worksiteNameById.get(record.worksite_id) ?? "-",
      intime: record.intime,
      outtime: record.outtime,
      intime_status: record.intime_status,
      work_intime: record.work_intime,
      work_outtime: record.work_outtime,
    }));

    return Response.json({
      employee,
      assignments,
      educationCompletions,
      totalEducationCount: educationResourcesResult.data?.length ?? 0,
      attendance,
      leaves: leavesResult.data ?? [],
      inspectionLogs: inspectionLogsResult.data ?? [],
      specialRemarks: specialRemarksResult.data ?? [],
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직원 정보를 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseAdmin();
    return Response.json({
      employee: await updateEmployee({
        id,
        name: body.name,
        phone: body.phone,
        is_retired: body.is_retired,
        role: body.role,
        work_style: body.work_style,
        in_time: body.in_time,
        out_time: body.out_time,
      }, supabase),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직원 정보를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    await deleteEmployee(id, getSupabaseAdmin());
    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직원 정보를 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
