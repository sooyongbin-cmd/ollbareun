import { currentEducationStatus, loadEducationDays, loadEducationHistory, markEducationCompletion, readAllEducationRows, resourceCompletionCounts } from "@/lib/education-completions";
import { educationPeriodStart, educationToday, type EducationType } from "@/lib/education-periods";
import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";
import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const databaseEducationTypes: Record<string, EducationType> = {
  "일일": "daily",
  "월간": "monthly",
  "분기": "quarterly",
  "반기": "semiannual",
};

async function listEmployeeRosterCompletions() {
  const supabase = getSupabaseAdmin();
  type Resource = { id: string; title: string; education_type: string; youtube_link: string };
  type Completion = { id: string; employee_id: string; title: string; education_type: string; work_date: string; completed_at: string };

  const [resources, completions] = await Promise.all([
    readAllEducationRows<Resource>((from, to) => supabase.from("education_resources")
      .select("id,title,education_type,youtube_link").order("title").order("id").range(from, to)),
    readAllEducationRows<Completion>((from, to) => supabase.from("education_completions")
      .select("id,employee_id,title,education_type,work_date,completed_at")
      .not("completed_at", "is", null).order("employee_id").order("completed_at", { ascending: false }).range(from, to)),
  ]);

  const resourceByTitle = new Map(resources.map((resource) => [resource.title, resource]));
  const today = educationToday();
  const now = Date.now();
  const current = new Map<string, Completion & { resource: Resource; educationType: EducationType }>();

  for (const completion of completions) {
    const resource = resourceByTitle.get(completion.title);
    const educationType = databaseEducationTypes[completion.education_type];
    if (!resource || !educationType || databaseEducationTypes[resource.education_type] !== educationType) continue;

    const periodStart = educationPeriodStart(educationType, today);
    const periodStartTime = new Date(`${periodStart}T00:00:00+09:00`).getTime();
    const completedAt = new Date(completion.completed_at).getTime();
    if (completedAt < periodStartTime || completedAt > now) continue;

    const key = `${completion.employee_id}:${resource.id}`;
    if (!current.has(key)) current.set(key, { ...completion, resource, educationType });
  }

  return [...current.values()].map(({ resource, educationType, ...completion }) => ({
    ...completion,
    resource_id: resource.id,
    resource_title: completion.title,
    resource_youtube_link: resource.youtube_link,
    education_date: completion.work_date,
    education_type: educationType,
    is_completed: true,
  }));
}

export async function GET(request: Request) {
  try {
    const manager = await getManagerUser();
    if (manager && new URL(request.url).searchParams.get("view") !== "current") {
      const params = new URL(request.url).searchParams;
      if (params.get("view") === "days") return Response.json(await loadEducationDays(params));
      if (params.get("view") === "history") return Response.json(await loadEducationHistory(params));
      if (params.get("view") === "resources") return Response.json({ counts: await resourceCompletionCounts() });
      return Response.json({ completions: await listEmployeeRosterCompletions() });
    }
    const employee = await requireGuardEmployee(request);
    return Response.json({ completions: await currentEducationStatus(employee.id) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수 목록을 불러오지 못했습니다." },
      { status: guardAuthErrorStatus(error) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employee = await requireGuardEmployee(request, body.employeeId);
    return Response.json({
      completion: await markEducationCompletion({
        employeeId: employee.id,
        resourceId: body.resourceId,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육이수 정보를 저장하지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}
