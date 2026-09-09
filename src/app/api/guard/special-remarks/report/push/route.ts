import { sendSpecialRemarkManagerNotifications } from "@/lib/manager-push-notifications";
import { createSpecialRemarkReport, sendSpecialRemarkReportEmail } from "@/lib/special-remark-reports";
import { getActiveEmployeeErrorStatus, requireActiveEmployee } from "@/lib/active-employee";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await requireActiveEmployee(body.employeeId);
    let report = await createSpecialRemarkReport(body, { sendEmail: false });
    let delivery;
    try {
      delivery = await sendSpecialRemarkManagerNotifications(report);
    } catch (pushError) {
      delivery = {
        successCount: 0,
        failedCount: 0,
        unregisteredCount: 0,
        error: pushError instanceof Error ? pushError.message : "관리자 푸시 발송에 실패했습니다.",
      };
    }

    let email;
    try {
      report = await sendSpecialRemarkReportEmail(report, "naver");
      email = { status: "sent" };
    } catch (emailError) {
      email = {
        status: "failed",
        error: emailError instanceof Error ? emailError.message : "NAVER 이메일 발송에 실패했습니다.",
      };
    }
    return Response.json({ report, delivery, email });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "특이사항 보고를 저장하지 못했습니다." },
      { status: getActiveEmployeeErrorStatus(error, 400) },
    );
  }
}
