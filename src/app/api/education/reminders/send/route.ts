import { sendEducationReminderNotifications } from "@/lib/education-reminder-notifications";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const employeeIds = Array.isArray(body.employeeIds)
      ? body.employeeIds.filter((employeeId: unknown): employeeId is string => typeof employeeId === "string")
      : undefined;

    const result = await sendEducationReminderNotifications({ employeeIds });
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육알림 전송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
