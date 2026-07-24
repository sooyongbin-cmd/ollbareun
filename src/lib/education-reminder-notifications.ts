import webpush from "web-push";
import { getSupabase } from "@/lib/supabase";
import { listEmployeeIdsOffOnDate } from "@/lib/assignment-days-off";
import { formatKstDate } from "@/lib/education-reminder-schedule";

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

export type EducationReminderResult = {
  success: true;
  successCount: number;
  failedCount: number;
  unregisteredCount: number;
  notifiedEmployees: string[];
  notifiedEmployeeIds: string[];
  unregisteredEmployees: string[];
  unregisteredEmployeeIds: string[];
  failedEmployees: { employeeId: string; employeeName: string; reason: string }[];
  dayOffExcludedCount: number;
  dayOffExcludedEmployeeIds: string[];
};

export type SendEducationReminderNotificationsInput = {
  employeeIds?: string[];
  excludeDaysOff?: boolean;
};

const educationReminderUrl = "/guard/main/safety";

function configureWebPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("VAPID 키가 구성되지 않았습니다.");
  }

  webpush.setVapidDetails("mailto:admin@ollbareun.com", vapidPublicKey, vapidPrivateKey);
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

export async function sendEducationReminderNotifications(
  input: SendEducationReminderNotificationsInput = {},
): Promise<EducationReminderResult> {
  configureWebPush();

  const supabase = getSupabase();
  const hasEmployeeFilter = Array.isArray(input.employeeIds);
  const selectedEmployeeIds = new Set((input.employeeIds ?? []).filter(Boolean));

  const [employeesResult, resourcesResult, completionsResult, dayOffEmployeeIds] = await Promise.all([
    supabase.from("employees").select("id, name, is_retired"),
    supabase.from("education_resources").select("id"),
    supabase.from("education_completions").select("employee_id, resource_id, is_completed"),
    input.excludeDaysOff ? listEmployeeIdsOffOnDate(formatKstDate()) : Promise.resolve([]),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);
  if (resourcesResult.error) throw new Error(resourcesResult.error.message);
  if (completionsResult.error) throw new Error(completionsResult.error.message);

  const employees = (employeesResult.data ?? []) as EmployeeRow[];
  const resources = (resourcesResult.data ?? []) as EducationResourceRow[];
  const completions = (completionsResult.data ?? []) as EducationCompletionRow[];
  const dayOffEmployeeIdSet = new Set(dayOffEmployeeIds);

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

  const eligibleTargets = employees
    .filter((employee) => !employee.is_retired)
    .filter((employee) => !hasEmployeeFilter || selectedEmployeeIds.has(employee.id))
    .map((employee) => ({
      employeeId: employee.id,
      employeeName: employee.name,
      uncompletedCount: Math.max(totalResourceCount - (completedCountByEmployeeId.get(employee.id) ?? 0), 0),
    }))
    .filter((target) => target.uncompletedCount >= 1);
  const dayOffExcludedEmployeeIds = eligibleTargets
    .filter((target) => dayOffEmployeeIdSet.has(target.employeeId))
    .map((target) => target.employeeId);
  const targets = eligibleTargets.filter((target) => !dayOffEmployeeIdSet.has(target.employeeId));

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
    dayOffExcludedCount: dayOffExcludedEmployeeIds.length,
    dayOffExcludedEmployeeIds,
  };
}
