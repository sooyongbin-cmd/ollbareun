import EducationHistoryTable from "@/components/education-history-table";

type EducationCompletionsEmployeePageProps = {
  params: Promise<{ employeeId: string }>;
};

export default async function EducationCompletionsEmployeePage({ params }: EducationCompletionsEmployeePageProps) {
  const { employeeId } = await params;
  return <EducationHistoryTable key={employeeId} detail employeeId={employeeId} />;
}
