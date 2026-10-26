import { buildAttendanceReport, type AttendanceReportRow } from "./manager-reports";
import { getSupabaseAdmin } from "./supabase-admin";
import { readAllEducationRows } from "./education-completions";

export type MonthlyAttendanceRow = AttendanceReportRow & {
  employeeId: string;
  worksiteId: string | null;
  employeeBirthdate?: string | null;
  employeePhone?: string | null;
};

export async function loadMonthlyAttendance(yearMonth: string, employeeId?: string): Promise<MonthlyAttendanceRow[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error("조회년월을 확인하세요.");
  const start = `${yearMonth}-01`;
  const next = new Date(`${start}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const end = next.toISOString().slice(0, 10);
  const supabase = getSupabaseAdmin();
  type Input = Parameters<typeof buildAttendanceReport>[0];
  const attendancePromise = readAllEducationRows<Input["attendance"][number]>((from, to) => {
      const query = supabase.from("work_record")
      .select("id,employee_id,worksite_id,work_date,intime,outtime,work_intime,work_outtime,intime_status,outtime_status")
      .gte("work_date", start).lt("work_date", end).order("work_date").order("id");
      return (employeeId ? query.eq("employee_id", employeeId) : query).range(from, to);
    });
  const [attendance, employees, worksites] = await Promise.all([
    attendancePromise,
    readAllEducationRows<Input["employees"][number] & { birthdate?: string | null; phone?: string | null }>((from, to) => {
      const query = supabase.from("employees").select("id,name,role,work_style,birthdate,phone").order("id");
      return (employeeId ? query.eq("id", employeeId) : query).range(from, to);
    }),
    employeeId ? attendancePromise.then((records) => {
      const siteIds = [...new Set(records.map((record) => record.worksite_id).filter((id): id is string => Boolean(id)))];
      return siteIds.length ? readAllEducationRows<{ id: string; name: string }>((from, to) => supabase.from("worksites")
        .select("id,name").in("id", siteIds).order("id").range(from, to)) : [];
    }) : readAllEducationRows<{ id: string; name: string }>((from, to) => supabase.from("worksites")
      .select("id,name").order("id").range(from, to)),
  ]);
  const now = new Date();
  const birthdateByEmployeeId = new Map(employees.map((employee) => [employee.id, employee.birthdate ?? null]));
  const phoneByEmployeeId = new Map(employees.map((employee) => [employee.id, employee.phone ?? null]));
  const attendanceById = new Map(attendance.map((record) => [record.id, record]));
  return [...new Set(attendance.map((record) => record.work_date))].sort().flatMap((workDate) =>
    buildAttendanceReport({ employeeName: "", workDate, employees, worksites,
      attendance: attendance.filter((record) => record.work_date === workDate), now }))
    .map((row) => {
      const record = attendanceById.get(row.id)!;
      return {
        ...row,
        employeeId: record.employee_id,
        employeeBirthdate: birthdateByEmployeeId.get(record.employee_id) ?? null,
        employeePhone: phoneByEmployeeId.get(record.employee_id) ?? null,
        worksiteId: record.worksite_id ?? null,
      };
    })
    .sort((left, right) => left.worksiteName.localeCompare(right.worksiteName, "ko-KR")
      || left.employeeName.localeCompare(right.employeeName, "ko-KR")
      || left.workDate.localeCompare(right.workDate));
}
