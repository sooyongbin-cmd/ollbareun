import { getSupabaseAdmin } from "./supabase-admin";

export type PushNotificationRunStatus = "processing" | "sent" | "failed" | "skipped";

export type PushNotificationRunRow = {
  id: string;
  notification_code: string;
  scheduled_date: string;
  scheduled_time: string;
  status: PushNotificationRunStatus;
  sent_at: string | null;
  error_message: string | null;
  result: unknown | null;
  created_at: string;
  updated_at: string;
};

type SupabaseError = {
  message?: string;
};

function throwIfError(error: SupabaseError | null | undefined) {
  if (error) {
    throw new Error(error.message ?? "자동알림 로그를 불러오지 못했습니다.");
  }
}

function isPushNotificationRunStatus(value: string | null | undefined): value is PushNotificationRunStatus {
  return value === "processing" || value === "sent" || value === "failed" || value === "skipped";
}

export async function listPushNotificationRuns(input: {
  notificationCode?: string | null;
  status?: string | null;
  limit?: number;
}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("push_notification_runs")
    .select("*")
    .order("created_at", { ascending: false });

  const notificationCode = input.notificationCode?.trim();
  if (notificationCode) {
    query = query.eq("notification_code", notificationCode);
  }

  if (isPushNotificationRunStatus(input.status)) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query.limit(input.limit ?? 100);
  throwIfError(error);
  return (data ?? []) as PushNotificationRunRow[];
}
