import { guardAuthErrorStatus, requireGuardEmployee } from "@/lib/guard-auth-session";
import { createLeave } from "@/lib/leave";
import { parseLeaveTypes } from "@/lib/leave-types";
import { sendLeaveManagerNotifications } from "@/lib/leave-manager-push-notifications";
import { getSystemConfigContent } from "@/lib/system-configs";

async function loadLeaveTypes() {
  const types = parseLeaveTypes(await getSystemConfigContent("leave_code"));
  if (types.length === 0) {
    throw new Error("등록된 휴가구분이 없습니다. 관리자에게 문의해 주세요.");
  }
  return types;
}

export async function GET(request: Request) {
  try {
    await requireGuardEmployee(request);
    return Response.json({ types: await loadLeaveTypes() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "휴가구분을 불러오지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const employee = await requireGuardEmployee(request, body.employeeId);
    const types = await loadLeaveTypes();
    if (typeof body.leaveType !== "string" || !types.includes(body.leaveType)) {
      throw new Error("등록된 휴가구분을 선택하세요.");
    }

    const leave = await createLeave({
      employeeId: employee.id,
      leaveType: body.leaveType,
      startDate: body.startDate,
      endDate: body.endDate,
    });
    if (!leave) throw new Error("휴가 신청 결과를 확인하지 못했습니다.");

    let delivery;
    try {
      delivery = await sendLeaveManagerNotifications({
        id: leave.id,
        employeeName: employee.name,
        leaveType: leave.leave_type,
        startDate: leave.start_date,
        endDate: leave.end_date,
      });
    } catch (error) {
      delivery = {
        successCount: 0,
        failedCount: 0,
        unregisteredCount: 0,
        error: error instanceof Error ? error.message : "관리자 푸시알림 전송에 실패했습니다.",
      };
    }
    return Response.json({ leave: { id: leave.id }, delivery }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "휴가를 신청하지 못했습니다." },
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}
