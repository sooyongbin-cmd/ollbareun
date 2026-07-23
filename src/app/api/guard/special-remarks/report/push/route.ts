import { sendSpecialRemarkManagerNotifications } from "@/lib/manager-push-notifications";
import { createSpecialRemarkReport } from "@/lib/special-remark-reports";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const report = await createSpecialRemarkReport(body, { sendEmail: false });

    try {
      const delivery = await sendSpecialRemarkManagerNotifications(report);
      return Response.json({ report, delivery });
    } catch (pushError) {
      return Response.json({
        report,
        delivery: {
          successCount: 0,
          failedCount: 0,
          unregisteredCount: 0,
          error: pushError instanceof Error ? pushError.message : "관리자 푸시 발송에 실패했습니다.",
        },
      });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "특이사항 보고를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
