import { listEducationCompletions, readAllEducationRows } from "./education-completions";
import { educationPeriodStart, type EducationType } from "./education-periods";
import webpush from "web-push";
import { notificationBranding } from "./notification-branding";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

type EducationReminderJob = {
  work_record_id: string;
  employee_id: string;
  work_date: string;
  due_at: string;
  attempts: number;
};

type EducationResourceSnapshot = {
  id: string;
  title: string;
  created_at: string;
  education_type: string;
};

type EducationCompletionSnapshot = {
  id: string;
  employee_id: string;
  title: string;
  work_date: string;
  education_type: string;
};

const educationTypeByKoreanName: Record<string, EducationType> = {
  "일일": "daily",
  "월간": "monthly",
  "분기": "quarterly",
  "반기": "semiannual",
};

const reminderJobBatchSize = 50;
const reminderJobRetryLimit = 8;
const reminderJobRetryDelayMs = 10 * 60 * 1000;

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
};

export type SendEducationReminderNotificationsInput = {
  employeeIds?: string[];
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

  const supabase = getSupabaseAdmin();
  const hasEmployeeFilter = Array.isArray(input.employeeIds);
  const selectedEmployeeIds = new Set((input.employeeIds ?? []).filter(Boolean));

  const [employeesResult, resourcesResult, completionsResult] = await Promise.all([
    supabase.from("employees").select("id, name, is_retired"),
    supabase.from("education_resources").select("id"),
    listEducationCompletions(supabase).then((data) => ({ data, error: null })),
  ]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);
  if (resourcesResult.error) throw new Error(resourcesResult.error.message);

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
    .filter((employee) => !hasEmployeeFilter || selectedEmployeeIds.has(employee.id))
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
        ...notificationBranding,
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

function getMissingEducationCounts(jobs: EducationReminderJob[], resources: EducationResourceSnapshot[], completions: EducationCompletionSnapshot[]) {
  const completionDatesByResource = new Map<string, string[]>();
  completions.forEach((completion) => {
    if (!educationTypeByKoreanName[completion.education_type]) return;
    const key = `${completion.employee_id}\u0000${completion.title}\u0000${completion.education_type}`;
    const dates = completionDatesByResource.get(key) ?? [];
    dates.push(completion.work_date);
    completionDatesByResource.set(key, dates);
  });

  return new Map(jobs.map((job) => {
    const dateEnd = new Date(`${job.work_date}T23:59:59.999+09:00`).getTime();
    const availableResources = resources.filter((resource) => {
      return educationTypeByKoreanName[resource.education_type]
        && new Date(resource.created_at).getTime() <= dateEnd;
    });

    const missingCount = availableResources.reduce((count, resource) => {
      const type = educationTypeByKoreanName[resource.education_type];
      if (!type) return count;
      const periodStart = educationPeriodStart(type, job.work_date);
      const key = `${job.employee_id}\u0000${resource.title}\u0000${resource.education_type}`;
      const completedInPeriod = (completionDatesByResource.get(key) ?? []).some((workDate) => {
        return workDate >= periodStart && workDate <= job.work_date;
      });
      return count + (completedInPeriod ? 0 : 1);
    }, 0);

    return [job.work_record_id, missingCount] as const;
  }));
}

async function finishReminderJob(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  job: EducationReminderJob,
  status: "sent" | "skipped",
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("education_reminder_jobs")
    .update({
      status,
      locked_until: null,
      sent_at: status === "sent" ? now : null,
      finished_at: now,
      last_error: null,
      updated_at: now,
    })
    .eq("work_record_id", job.work_record_id)
    .eq("status", "processing")
    .select("work_record_id");

  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(`알림 작업 상태를 갱신하지 못했습니다: ${job.work_record_id}`);
}

async function retryReminderJob(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  job: EducationReminderJob,
  reason: string,
) {
  const now = new Date();
  const isTerminalFailure = job.attempts >= reminderJobRetryLimit;
  const { data, error } = await supabase
    .from("education_reminder_jobs")
    .update({
      status: isTerminalFailure ? "failed" : "pending",
      next_attempt_at: new Date(now.getTime() + reminderJobRetryDelayMs).toISOString(),
      locked_until: null,
      finished_at: isTerminalFailure ? now.toISOString() : null,
      last_error: reason.slice(0, 1000),
      updated_at: now.toISOString(),
    })
    .eq("work_record_id", job.work_record_id)
    .eq("status", "processing")
    .select("work_record_id");

  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(`알림 재시도 상태를 갱신하지 못했습니다: ${job.work_record_id}`);
}

/** Process only attendance reminders whose 30-minute deadline has passed. */
export async function processDueEducationReminderJobs(): Promise<EducationReminderResult> {
  configureWebPush();

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("claim_due_education_reminder_jobs", {
    p_batch_size: reminderJobBatchSize,
  });
  if (error) throw new Error(error.message);

  const jobs = (data ?? []) as EducationReminderJob[];
  const emptyResult: EducationReminderResult = {
    success: true,
    successCount: 0,
    failedCount: 0,
    unregisteredCount: 0,
    notifiedEmployees: [],
    notifiedEmployeeIds: [],
    unregisteredEmployees: [],
    unregisteredEmployeeIds: [],
    failedEmployees: [],
  };
  if (jobs.length === 0) return emptyResult;

  const employeeIds = [...new Set(jobs.map((job) => job.employee_id))];
  let employees: EmployeeRow[];
  let resources: EducationResourceSnapshot[];
  let completions: EducationCompletionSnapshot[];
  try {
    const [employeesResult, resourceRows, completionRows] = await Promise.all([
      supabase.from("employees").select("id, name, is_retired").in("id", employeeIds),
      readAllEducationRows<EducationResourceSnapshot>((from, to) => supabase
        .from("education_resources")
        .select("id,title,created_at,education_type")
        .order("title").order("id").range(from, to)),
      (async () => {
        const relevantTypes = ["일일", "월간", "분기", "반기"] as const;
        const minimumWorkDate = jobs.reduce((minimum, job) => {
          return relevantTypes.reduce((dateMinimum, type) => {
            const periodStart = educationPeriodStart(educationTypeByKoreanName[type], job.work_date);
            return periodStart < dateMinimum ? periodStart : dateMinimum;
          }, minimum);
        }, jobs[0].work_date);
        const maximumWorkDate = jobs.reduce((maximum, job) => job.work_date > maximum ? job.work_date : maximum, jobs[0].work_date);

        return readAllEducationRows<EducationCompletionSnapshot>((from, to) => supabase
          .from("education_completions")
          .select("id,employee_id,title,work_date,education_type")
          .in("employee_id", employeeIds)
          .gte("work_date", minimumWorkDate)
          .lte("work_date", maximumWorkDate)
          .order("employee_id").order("work_date").order("id").range(from, to));
      })(),
    ]);

    if (employeesResult.error) throw new Error(employeesResult.error.message);
    employees = (employeesResult.data ?? []) as EmployeeRow[];
    resources = resourceRows;
    completions = completionRows;
  } catch (lookupError) {
    const reason = lookupError instanceof Error ? lookupError.message : "교육이수 자료 조회에 실패했습니다.";
    await Promise.allSettled(jobs.map((job) => retryReminderJob(supabase, job, reason)));
    throw new Error(reason);
  }

  const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
  const missingCounts = getMissingEducationCounts(jobs, resources, completions);
  const targetJobs = jobs.filter((job) => {
    const employee = employeesById.get(job.employee_id);
    return Boolean(employee && !employee.is_retired && (missingCounts.get(job.work_record_id) ?? 0) > 0);
  });

  const targetEmployeeIds = [...new Set(targetJobs.map((job) => job.employee_id))];
  let subscriptions: PushSubscriptionRow[] = [];
  if (targetEmployeeIds.length > 0) {
    const subscriptionsResult = await supabase
      .from("push_subscriptions")
      .select("employee_id, endpoint, p256dh, auth")
      .in("employee_id", targetEmployeeIds);

    if (subscriptionsResult.error) {
      await Promise.allSettled(jobs.map((job) => retryReminderJob(supabase, job, subscriptionsResult.error!.message)));
      throw new Error(subscriptionsResult.error.message);
    }
    subscriptions = (subscriptionsResult.data ?? []) as PushSubscriptionRow[];
  }

  const subscriptionsByEmployeeId = new Map<string, PushSubscriptionRow[]>();
  subscriptions.forEach((subscription) => {
    const list = subscriptionsByEmployeeId.get(subscription.employee_id) ?? [];
    list.push(subscription);
    subscriptionsByEmployeeId.set(subscription.employee_id, list);
  });

  const result: EducationReminderResult = {
    ...emptyResult,
    failedCount: 0,
    unregisteredCount: 0,
    notifiedEmployees: [],
    notifiedEmployeeIds: [],
    unregisteredEmployees: [],
    unregisteredEmployeeIds: [],
    failedEmployees: [],
  };
  const notifiedEmployeeNames = new Set<string>();
  const notifiedEmployeeIdSet = new Set<string>();
  const unregisteredEmployeeNames = new Set<string>();
  const unregisteredEmployeeIdSet = new Set<string>();
  const deleteSubscriptionEndpoints = new Set<string>();

  await Promise.all(jobs.map(async (job) => {
    const employee = employeesById.get(job.employee_id);
    const missingCount = missingCounts.get(job.work_record_id) ?? 0;
    if (!employee || employee.is_retired || missingCount === 0) {
      await finishReminderJob(supabase, job, "skipped");
      return;
    }

    const employeeSubscriptions = subscriptionsByEmployeeId.get(job.employee_id) ?? [];
    if (employeeSubscriptions.length === 0) {
      const reason = "등록된 푸시 구독정보가 없습니다.";
      result.unregisteredCount++;
      unregisteredEmployeeNames.add(employee.name);
      unregisteredEmployeeIdSet.add(employee.id);
      result.failedEmployees.push({ employeeId: employee.id, employeeName: employee.name, reason });
      result.failedCount++;
      await retryReminderJob(supabase, job, reason);
      return;
    }

    const payload = JSON.stringify({
      title: "안전교육 이수 독려 알림",
      ...notificationBranding,
      body: `${employee.name} 님 ${missingCount}건의 교육을 이수해주세요.`,
      data: { url: educationReminderUrl },
    });

    let succeeded = false;
    let lastErrorReason = "";
    await Promise.all(employeeSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, payload);
        result.successCount++;
        succeeded = true;
      } catch (pushError) {
        result.failedCount++;
        const reason = getErrorReason(pushError);
        lastErrorReason = reason;
        if (reason.includes("HTTP 410") || reason.includes("HTTP 404")) {
          deleteSubscriptionEndpoints.add(subscription.endpoint);
        }
      }
    }));

    if (succeeded) {
      notifiedEmployeeNames.add(employee.name);
      notifiedEmployeeIdSet.add(employee.id);
      await finishReminderJob(supabase, job, "sent");
    } else {
      result.failedEmployees.push({
        employeeId: employee.id,
        employeeName: employee.name,
        reason: lastErrorReason || "기기 전송 실패",
      });
      await retryReminderJob(supabase, job, lastErrorReason || "기기 전송 실패");
    }
  }));

  if (deleteSubscriptionEndpoints.size > 0) {
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", [...deleteSubscriptionEndpoints]);
    if (deleteError) console.error("Failed to delete expired push subscriptions:", deleteError);
  }

  result.notifiedEmployees = [...notifiedEmployeeNames];
  result.notifiedEmployeeIds = [...notifiedEmployeeIdSet];
  result.unregisteredEmployees = [...unregisteredEmployeeNames];
  result.unregisteredEmployeeIds = [...unregisteredEmployeeIdSet];
  result.unregisteredCount = unregisteredEmployeeIdSet.size;
  return result;
}
