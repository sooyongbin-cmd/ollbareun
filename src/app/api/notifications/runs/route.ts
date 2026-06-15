import { listPushNotificationRuns } from "@/lib/push-notification-runs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const runs = await listPushNotificationRuns({
      notificationCode: url.searchParams.get("notificationCode"),
      status: url.searchParams.get("status"),
      limit: 100,
    });

    return Response.json({ runs });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "자동알림 로그를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
