import { getManagerUser } from "@/lib/manager-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  try {
    if (!(await getManagerUser())) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const cronSecret = process.env.EDUCATION_REMINDER_CRON_SECRET;
    if (!cronSecret) {
      return Response.json({ error: "교육알림 실행 인증값이 구성되지 않았습니다." }, { status: 500 });
    }

    const { data, error } = await getSupabaseAdmin().functions.invoke("education-reminders", {
      body: { source: "manager-manual" },
      headers: { "x-cron-secret": cronSecret },
    });

    if (error) {
      return Response.json(
        { error: error.message || "교육알림 Edge Function 실행에 실패했습니다." },
        { status: 502 },
      );
    }

    return Response.json(data ?? {});
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "교육알림 Edge Function 실행에 실패했습니다." },
      { status: 500 },
    );
  }
}
