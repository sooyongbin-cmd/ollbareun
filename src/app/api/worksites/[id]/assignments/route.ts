import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const { id: worksiteId } = await params;
    const supabase = getSupabaseAdmin();
    const { data: assignments, error: assignmentsError } = await supabase
      .from("work_assignments")
      .select("id,employee_id,start_date,end_date,work_style,created_at")
      .eq("worksite_id", worksiteId)
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    const employeeIds = Array.from(new Set((assignments ?? []).map((assignment) => assignment.employee_id)));
    const employeesResult = employeeIds.length
      ? await supabase.from("employees").select("id,name,role,work_style").in("id", employeeIds)
      : { data: [], error: null };

    if (employeesResult.error) {
      throw new Error(employeesResult.error.message);
    }

    const employeesById = new Map((employeesResult.data ?? []).map((employee) => [employee.id, employee]));

    return Response.json({
      assignments: (assignments ?? []).map((assignment) => {
        const employee = employeesById.get(assignment.employee_id);

        return {
          id: assignment.id,
          employee_name: employee?.name ?? "직원 없음",
          employee_role: employee?.role ?? null,
          work_style: assignment.work_style ?? employee?.work_style ?? null,
          start_date: assignment.start_date,
          end_date: assignment.end_date,
        };
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "근무지배정 이력을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
