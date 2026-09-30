import webpush from "web-push";
import { getSupabaseAdmin } from "./supabase-admin";
import type { ManagerPushDeliveryResult } from "./manager-push-notifications";

type LeaveNotification = {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
};

// Use the same manager subscriptions and delivery policy as special-remark reports.
export async function sendLeaveManagerNotifications(leave: LeaveNotification): Promise<ManagerPushDeliveryResult> {
  const supabase = getSupabaseAdmin();
  const { data: admins, error: adminError } = await supabase
    .from("admin_users").select("user_id").not("user_id", "is", null);
  if (adminError) throw new Error(adminError.message || "관리자 목록을 불러오지 못했습니다.");

  const adminUserIds = Array.from(new Set(
    ((admins ?? []) as { user_id: string | null }[])
      .map((admin) => admin.user_id)
      .filter((id): id is string => Boolean(id)),
  ));
  if (adminUserIds.length === 0) return { successCount: 0, failedCount: 0, unregisteredCount: 0 };

  const { data, error } = await supabase.from("manager_push_subscriptions")
    .select("user_id, endpoint, p256dh, auth").in("user_id", adminUserIds);
  if (error) throw new Error(error.message || "관리자 푸시 구독을 불러오지 못했습니다.");
  const subscriptions = (data ?? []) as { user_id: string; endpoint: string; p256dh: string; auth: string }[];
  const registeredUserIds = new Set(subscriptions.map((subscription) => subscription.user_id));
  const unregisteredCount = adminUserIds.filter((id) => !registeredUserIds.has(id)).length;
  if (subscriptions.length === 0) return { successCount: 0, failedCount: 0, unregisteredCount };

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  if (!publicKey || !privateKey) throw new Error("VAPID 키가 구성되지 않았습니다.");
  webpush.setVapidDetails("mailto:admin@ollbareun.com", publicKey, privateKey);

  const period = leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate}~${leave.endDate}`;
  const payload = JSON.stringify({
    title: "새 휴가신청",
    body: `${leave.employeeName} · ${leave.leaveType}\n${period}`,
    icon: "/manager-icon-192.png",
    badge: "/manager-icon-192.png",
    data: { url: `/manager/auth?next=${encodeURIComponent(`/manager/leave/${leave.id}`)}` },
  });
  const expiredEndpoints: string[] = [];
  let successCount = 0;
  let failedCount = 0;
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload);
      successCount += 1;
    } catch (error) {
      failedCount += 1;
      if (error && typeof error === "object" && "statusCode" in error &&
        (error.statusCode === 404 || error.statusCode === 410)) {
        expiredEndpoints.push(subscription.endpoint);
      }
    }
  }));

  if (expiredEndpoints.length > 0) {
    const { error: deleteError } = await supabase.from("manager_push_subscriptions")
      .delete().in("endpoint", expiredEndpoints);
    if (deleteError) console.warn("만료된 관리자 푸시 구독을 정리하지 못했습니다.", deleteError);
  }
  return { successCount, failedCount, unregisteredCount };
}
