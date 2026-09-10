import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requestEducationReminders } from "./reminder-client.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const notificationCode = "education_reminder";
const notificationHistoryEnabledConfigCode = "system_log_002";
const dailyPushMessageTimeCode = "daily_push_message_time";
const dailyPushTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function parseDailyPushMessageTimes(content: string) {
  return content
    .split(",")
    .map((time) => time.trim())
    .filter((time) => dailyPushTimePattern.test(time));
}

function formatKstDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatKstTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

async function isNotificationHistoryEnabled(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("system_configs")
    .select("content")
    .eq("system_code", notificationHistoryEnabledConfigCode)
    .maybeSingle();

  if (error) {
    console.error("Failed to read notification history setting:", error);
    return false;
  }

  if (!data || typeof data.content !== "string") {
    return false;
  }

  return data.content.trim().toUpperCase() === "Y";
}

Deno.serve(async (request) => {
  const cronSecret = requireEnv("EDUCATION_REMINDER_CRON_SECRET");
  if (request.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const scheduledDate = formatKstDate(now);
  const scheduledTime = formatKstTime(now);
  const supabase = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: config, error: configError } = await supabase
    .from("system_configs")
    .select("content")
    .eq("system_code", dailyPushMessageTimeCode)
    .maybeSingle();

  if (configError) {
    return jsonResponse({ error: configError.message }, { status: 500 });
  }

  const scheduledTimes = parseDailyPushMessageTimes(config?.content ?? "");
  if (!scheduledTimes.includes(scheduledTime)) {
    return jsonResponse({
      success: true,
      skipped: true,
      reason: "not_scheduled_time",
      scheduledDate,
      scheduledTime,
      configuredTimes: scheduledTimes,
    });
  }

  const shouldRecordHistory = await isNotificationHistoryEnabled(supabase);
  let runId: string | null = null;

  if (shouldRecordHistory) {
    const { data: run, error: runInsertError } = await supabase
      .from("push_notification_runs")
      .insert({
        notification_code: notificationCode,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        status: "processing",
      })
      .select("id")
      .single();

    if (runInsertError) {
      if (runInsertError.code === "23505") {
        return jsonResponse({
          success: true,
          skipped: true,
          reason: "duplicate",
          scheduledDate,
          scheduledTime,
        });
      }

      return jsonResponse({ error: runInsertError.message }, { status: 500 });
    }

    runId = run.id;
  }

  try {
    const result = await requestEducationReminders({
      apiUrl: requireEnv("EDUCATION_REMINDER_API_URL"),
      cronSecret,
    });
    const errorMessage = result.failedCount > 0 && result.failedEmployees.length > 0
      ? result.failedEmployees.map((failed) => `${failed.employeeName}: ${failed.reason}`).join(", ")
      : null;

    if (runId) {
      await supabase
        .from("push_notification_runs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          result,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    return jsonResponse({
      ...result,
      scheduledDate,
      scheduledTime,
      ...(runId ? { runId } : {}),
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "안전교육 자동알림 발송 중 오류가 발생했습니다.";
    if (runId) {
      await supabase
        .from("push_notification_runs")
        .update({
          status: "failed",
          error_message: errorMessage,
          result: { error: errorMessage },
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    return jsonResponse({ error: errorMessage, scheduledDate, scheduledTime, ...(runId ? { runId } : {}) }, { status: 500 });
  }
});
