import EducationAttendancePage from "../education-attendance-page";

export default async function DailyEducationPage({ searchParams }: {
  searchParams: Promise<{ name?: string | string[]; workDate?: string | string[] }>;
}) {
  const params = await searchParams;
  const name = typeof params.name === "string" ? params.name : "";
  const date = typeof params.workDate === "string" ? params.workDate : "";
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  const workDate = validDate ? date : undefined;
  return <EducationAttendancePage key={JSON.stringify([name, workDate])} mode="daily" initialName={name} initialWorkDate={workDate} />;
}
