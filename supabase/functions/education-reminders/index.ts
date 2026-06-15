import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type EmployeeRow = {
  id: string;
  name: string;
  is_retired: boolean;
};

type EducationResourceRow = {
  id: string;
};

type EducationCompletionRow = {
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
};

type PushSubscriptionRow = {
  employee_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type EducationReminderResult = {
  success: true;
  successCount: number;
  failedCount: number;
  unregisteredCount: number;
  notifiedEmployees: string[];
  notifiedEmployeeIds: string[];
  unregisteredEmployees: string[];
  unregisteredEmployeeIds: string[];
  failedEmployees: { employeeId: string; employeeName: string; reason: string }[];
};

const notificationCode = "education_reminder";
const dailyPushMessageTimeCode = "daily_push_message_time";
const educationReminderUrl = "/guard/main/safety";
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

function getErrorReason(error: unknown) {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      return `기기 토큰 만료 또는 세션 만료 (HTTP ${statusCode})`;
    }
    return `네트워크/서버 오류 (HTTP ${statusCode})`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "알 수 없는 전송 오류";
}

function configureWebPush() {
  const vapidPublicKey = requireEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const vapidPrivateKey = requireEnv("VAPID_PRIVATE_KEY");
  webpush.setVapidDetails("mailto:admin@ollbareun.com", vapidPublicKey, vapidPrivateKey);
}

async function sendEducationReminderNotifications(supabase: ReturnType<typeof createClient>): Promise<EducationReminderResult> {
  configureWebPush();

  const [employeesResult, resourcesResult, completionsResult] = await Promise.all([
    supabase.from("employees").select("id, name, is_retired"),
    supabase.from("education_resources").select("id"),
    supabase.from("education_completions").select("employee_id, resource_id, is_completed"),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);
  if (resourcesResult.error) throw new Error(resourcesResult.error.message);
  if (completionsResult.error) throw new Error(completionsResult.error.message);

  const employees = (employeesResult.data ?? []) as EmployeeRow[];
  const resources = (resourcesResult.data ?? []) as EducationResourceRow[];
  const completions = (completionsResult.data ?? []) as EducationCompletionRow[];

  const totalResourceCount = resources.length;
  const completedCountByEmployeeId = new Map<string, number>();
  completions.forEach((completion) => {
    if (completion.is_completed) {
      completedCountByEmployeeId.set(
        completion.employee_id,
        (completedCountByEmployeeId.get(completion.employee_id) ?? 0) + 1,
      );
    }
  });

  const targets = employees
    .filter((employee) => !employee.is_retired)
    .map((employee) => ({
      employeeId: employee.id,
      employeeName: employee.name,
      uncompletedCount: Math.max(totalResourceCount - (completedCountByEmployeeId.get(employee.id) ?? 0), 0),
    }))
    .filter((target) => target.uncompletedCount >= 1);

  const targetEmployeeIds = targets.map((target) => target.employeeId);
  let subscriptions: PushSubscriptionRow[] = [];

  if (targetEmployeeIds.length > 0) {
    const subscriptionsResult = await supabase
      .from("push_subscriptions")
      .select("employee_id, endpoint, p256dh, auth")
      .in("employee_id", targetEmployeeIds);

    if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);
    subscriptions = (subscriptionsResult.data ?? []) as PushSubscriptionRow[];
  }

  const subscriptionMap = new Map<string, PushSubscriptionRow[]>();
  subscriptions.forEach((subscription) => {
    const list = subscriptionMap.get(subscription.employee_id) ?? [];
    list.push(subscription);
    subscriptionMap.set(subscription.employee_id, list);
  });

  const notifiedEmployees: string[] = [];
  const notifiedEmployeeIds: string[] = [];
  const unregisteredEmployees: string[] = [];
  const unregisteredEmployeeIds: string[] = [];
  const failedEmployees: { employeeId: string; employeeName: string; reason: string }[] = [];
  const deleteSubscriptionEndpoints: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  await Promise.all(
    targets.map(async (target) => {
      const employeeSubs = subscriptionMap.get(target.employeeId) ?? [];

      if (employeeSubs.length === 0) {
        unregisteredEmployees.push(target.employeeName);
        unregisteredEmployeeIds.push(target.employeeId);
        return;
      }

      const payload = JSON.stringify({
        title: "안전교육 이수 독려 알림",
        body: `${target.employeeName} 님 ${target.uncompletedCount}건의 교육을 이수해주세요.`,
        data: {
          url: educationReminderUrl,
        },
      });

      let employeeNotified = false;
      let lastErrorReason = "";

      for (const sub of employeeSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload,
          );
          successCount++;
          employeeNotified = true;
        } catch (error) {
          failedCount++;
          const reason = getErrorReason(error);
          lastErrorReason = reason;
          if (reason.includes("HTTP 410") || reason.includes("HTTP 404")) {
            deleteSubscriptionEndpoints.push(sub.endpoint);
          }
        }
      }

      if (employeeNotified) {
        notifiedEmployees.push(target.employeeName);
        notifiedEmployeeIds.push(target.employeeId);
      } else {
        failedEmployees.push({
          employeeId: target.employeeId,
          employeeName: target.employeeName,
          reason: lastErrorReason || "기기 전송 실패",
        });
      }
    }),
  );

  if (deleteSubscriptionEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", deleteSubscriptionEndpoints);
  }

  return {
    success: true,
    successCount,
    failedCount,
    unregisteredCount: unregisteredEmployees.length,
    notifiedEmployees,
    notifiedEmployeeIds,
    unregisteredEmployees,
    unregisteredEmployeeIds,
    failedEmployees,
  };
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

  try {
    const result = await sendEducationReminderNotifications(supabase);
    await supabase
      .from("push_notification_runs")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return jsonResponse({
      ...result,
      scheduledDate,
      scheduledTime,
      runId: run.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "안전교육 자동알림 발송 중 오류가 발생했습니다.";
    await supabase
      .from("push_notification_runs")
      .update({
        status: "failed",
        error_message: errorMessage,
        result: { error: errorMessage },
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    return jsonResponse({ error: errorMessage, scheduledDate, scheduledTime, runId: run.id }, { status: 500 });
  }
});
