import { sendSpecialRemarkManagerNotifications } from "@/lib/manager-push-notifications";
import { createSpecialRemarkReport, sendSpecialRemarkReportEmail } from "@/lib/special-remark-reports";
import { guardAuthErrorStatus, requireGuardWorksite } from "@/lib/guard-auth-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee, worksite } = await requireGuardWorksite(request, body.employeeId);
    const verifiedBody = { ...body, employeeId: employee.id, employeeName: employee.name, worksiteId: worksite.id, worksiteName: worksite.name };
    let report = await createSpecialRemarkReport(verifiedBody, { sendEmail: false });
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
      { status: guardAuthErrorStatus(error, 400) },
    );
  }
}
