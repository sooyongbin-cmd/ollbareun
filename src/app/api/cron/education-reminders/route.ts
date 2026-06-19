import { sendEducationReminderNotifications } from "@/lib/education-reminder-notifications";

export async function GET(request: Request) {
  const isVercelCron = request.headers.get("user-agent") === "vercel-cron/1.0";
  const configuredCronSecret = process.env.EDUCATION_REMINDER_CRON_SECRET;
  const hasValidCronSecret = Boolean(
    configuredCronSecret
      && request.headers.get("x-cron-secret") === configuredCronSecret,
  );

  if (!isVercelCron && !hasValidCronSecret) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await sendEducationReminderNotifications();
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육알림 cron 실행 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
