import { getSupabase } from "./supabase";

export type EducationCompletionRow = {
  employee_id: string;
  employee_name: string;
  resource_id: string;
  resource_title: string;
  resource_youtube_link: string;
  is_completed: boolean;
  completed_at: string | null;
};

function throwIfError(error: { message?: string } | null) {
  if (error) {
    throw new Error(error.message?.trim() || "교육이수 목록을 불러오지 못했습니다.");
  }
}

export async function listEducationCompletions() {
  const supabase = getSupabase();
  const [completionsResult, employeesResult, resourcesResult] = await Promise.all([
    supabase
      .from("education_completions")
      .select("employee_id,resource_id,is_completed,completed_at")
      .order("is_completed", { ascending: false })
      .order("completed_at", { ascending: false, nullsFirst: false }),
    supabase.from("employees").select("id,name"),
    supabase.from("education_resources").select("id,title,youtube_link"),
  ]);

  throwIfError(completionsResult.error);
  throwIfError(employeesResult.error);
  throwIfError(resourcesResult.error);

  const employeeById = new Map((employeesResult.data ?? []).map((employee) => [employee.id, employee.name]));
  const resourceById = new Map(
    (resourcesResult.data ?? []).map((resource) => [resource.id, { title: resource.title, youtube_link: resource.youtube_link }]),
  );

  return (completionsResult.data ?? []).map((completion) => ({
    employee_id: completion.employee_id,
    employee_name: employeeById.get(completion.employee_id) ?? completion.employee_id,
    resource_id: completion.resource_id,
    resource_title: resourceById.get(completion.resource_id)?.title ?? completion.resource_id,
    resource_youtube_link: resourceById.get(completion.resource_id)?.youtube_link ?? "",
    is_completed: completion.is_completed,
    completed_at: completion.completed_at,
  })) as EducationCompletionRow[];
}

export async function markEducationCompletion(input: { employeeId: unknown; resourceId: unknown }) {
  const employeeId = typeof input.employeeId === "string" && input.employeeId.trim() ? input.employeeId.trim() : "";
  const resourceId = typeof input.resourceId === "string" && input.resourceId.trim() ? input.resourceId.trim() : "";

  if (!employeeId) {
    throw new Error("직원 ID를 입력하세요.");
  }

  if (!resourceId) {
    throw new Error("교재 ID를 입력하세요.");
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("education_completions")
    .upsert(
      {
        employee_id: employeeId,
        resource_id: resourceId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "employee_id,resource_id" },
    )
    .select("employee_id,resource_id,is_completed,completed_at")
    .single();

  throwIfError(error);
  return data as {
    employee_id: string;
    resource_id: string;
    is_completed: boolean;
    completed_at: string;
  };
}
