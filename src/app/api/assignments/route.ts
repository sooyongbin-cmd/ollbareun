import { getManagerUser } from "@/lib/manager-auth";
import {
  AssignmentOverlapError,
  createAssignment,
  listAssignmentManagementData,
  listAttendanceForEmployeeInPeriod,
  listAssignmentsForEmployeeInPeriod,
} from "@/lib/phase1-data";

export async function GET(request: Request) {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const searchParams = new URL(request.url).searchParams;
    const employeeId = searchParams.get("employeeId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (employeeId || startDate || endDate) {
      if (!employeeId || !startDate || !endDate) {
        return Response.json({ error: "근무자와 근무기간을 모두 입력하세요." }, { status: 400 });
      }

      const [assignments, attendanceRecords] = await Promise.all([
        listAssignmentsForEmployeeInPeriod(employeeId, startDate, endDate),
        listAttendanceForEmployeeInPeriod(employeeId, startDate, endDate),
      ]);
      return Response.json({ assignments, attendanceRecords });
    }

    return Response.json(await listAssignmentManagementData());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "배정 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!await getManagerUser()) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const body = await request.json();
    return Response.json(await createAssignment(body));
  } catch (error) {
    if (error instanceof AssignmentOverlapError) {
      const overlapDetails = error.conflicts.length > 1
        ? { conflicts: error.conflicts }
        : { conflict: error.conflicts[0] ?? null };
      return Response.json(
        { error: error.message, ...overlapDetails },
        { status: 409 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "근무지를 배정하지 못했습니다." },
      { status: 400 },
    );
  }
}
