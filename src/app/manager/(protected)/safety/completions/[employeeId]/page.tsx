import EducationHistoryTable from "@/components/education-history-table";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type EducationCompletionsEmployeePageProps = {
  params: Promise<{ employeeId: string }>;
};

export default async function EducationCompletionsEmployeePage({ params }: EducationCompletionsEmployeePageProps) {
  const { employeeId } = await params;
  const { data: employee } = await getSupabaseAdmin().from("employees").select("name").eq("id", employeeId).maybeSingle();
  return <EducationHistoryTable key={employeeId} detail employeeDetail employeeId={employeeId} employeeName={employee?.name ?? ""} />;
}
