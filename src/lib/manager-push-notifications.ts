import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { SpecialRemarkReportRow } from "@/lib/special-remark-reports";

type AdminUserRow = {
  user_id: string | null;
};

type ManagerPushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type ManagerPushDeliveryResult = {
  successCount: number;
  failedCount: number;
  unregisteredCount: number;
};

export type ManagerPushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const SPECIAL_REMARK_EXCERPT_LENGTH = 120;

function configureWebPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("VAPID 키가 구성되지 않았습니다.");
  }

  webpush.setVapidDetails("mailto:admin@ollbareun.com", vapidPublicKey, vapidPrivateKey);
}

function getSpecialRemarkExcerpt(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > SPECIAL_REMARK_EXCERPT_LENGTH
    ? `${normalized.slice(0, SPECIAL_REMARK_EXCERPT_LENGTH)}…`
    : normalized;
}

function isExpiredSubscriptionError(error: unknown) {
  return (
    error !== null &&
    typeof error === "object" &&
    "statusCode" in error &&
    ((error as { statusCode?: unknown }).statusCode === 404 ||
      (error as { statusCode?: unknown }).statusCode === 410)
  );
}

export async function saveManagerPushSubscription(
  userId: string,
  subscription: ManagerPushSubscriptionInput,
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("manager_push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    )
    .select("id, user_id, endpoint, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message || "관리자 푸시 구독을 저장하지 못했습니다.");
  }

  return data;
}

export async function sendSpecialRemarkManagerNotifications(
  report: Pick<SpecialRemarkReportRow, "id" | "employee_name" | "worksite_name" | "content">,
): Promise<ManagerPushDeliveryResult> {
  const supabase = getSupabaseAdmin();

  const { data: admins, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .not("user_id", "is", null);

  if (adminError) {
    throw new Error(adminError.message || "관리자 목록을 불러오지 못했습니다.");
  }

  const adminUserIds = Array.from(
    new Set(
      ((admins ?? []) as AdminUserRow[])
        .map((admin) => admin.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );

  if (adminUserIds.length === 0) {
    return { successCount: 0, failedCount: 0, unregisteredCount: 0 };
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from("manager_push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", adminUserIds);

  if (subscriptionError) {
    throw new Error(subscriptionError.message || "관리자 푸시 구독을 불러오지 못했습니다.");
  }

  const managerSubscriptions = (subscriptions ?? []) as ManagerPushSubscriptionRow[];
  const registeredUserIds = new Set(managerSubscriptions.map((subscription) => subscription.user_id));

  if (managerSubscriptions.length === 0) {
    return {
      successCount: 0,
      failedCount: 0,
      unregisteredCount: adminUserIds.length,
    };
  }

  configureWebPush();
  const reportDetailUrl = `/manager/inspection/special-remarks/${report.id}`;
  const payload = JSON.stringify({
    title: "새 특이사항 보고",
    body: `${report.employee_name} · ${report.worksite_name}\n${getSpecialRemarkExcerpt(report.content)}`,
    icon: "/manager-icon-192.png",
    badge: "/manager-icon-192.png",
    data: {
      url: `/manager/auth?next=${encodeURIComponent(reportDetailUrl)}`,
    },
  });

  const expiredEndpoints: string[] = [];
  let successCount = 0;
  let failedCount = 0;

  await Promise.all(
    managerSubscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
        successCount += 1;
      } catch (error) {
        failedCount += 1;
        if (isExpiredSubscriptionError(error)) {
          expiredEndpoints.push(subscription.endpoint);
        }
      }
    }),
  );

  if (expiredEndpoints.length > 0) {
    const { error: deleteError } = await supabase
      .from("manager_push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);

    if (deleteError) {
      console.warn("만료된 관리자 푸시 구독을 정리하지 못했습니다.", deleteError);
    }
  }

  return {
    successCount,
    failedCount,
    unregisteredCount: adminUserIds.filter((userId) => !registeredUserIds.has(userId)).length,
  };
}
