import { getSupabase } from "@/lib/supabase";
import webpush from "web-push";

// Configure web-push with VAPID details if available
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@ollbareun.com",
    vapidPublicKey,
    vapidPrivateKey,
  );
}

type NotificationRequest = {
  employeeId: string;
  employeeName: string;
  uncompletedCount: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const notifications = body.notifications as NotificationRequest[];

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return Response.json({ error: "notifications 배열이 유효하지 않거나 비어 있습니다." }, { status: 400 });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return Response.json({ error: "VAPID 키가 구성되지 않았습니다." }, { status: 500 });
    }

    const supabase = getSupabase();
    const employeeIds = notifications.map((n) => n.employeeId);

    // Fetch all push subscriptions for the targeted employees
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("employee_id, endpoint, p256dh, auth")
      .in("employee_id", employeeIds);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    // Group subscriptions by employeeId
    const subscriptionMap = new Map<string, typeof subscriptions>();
    if (subscriptions) {
      for (const sub of subscriptions) {
        const list = subscriptionMap.get(sub.employee_id) || [];
        list.push(sub);
        subscriptionMap.set(sub.employee_id, list);
      }
    }

    const notifiedEmployees: string[] = [];
    const notifiedEmployeeIds: string[] = [];
    const unregisteredEmployees: string[] = [];
    const unregisteredEmployeeIds: string[] = [];
    const failedEmployees: { employeeId: string; employeeName: string; reason: string }[] = [];
    let successCount = 0;
    let failedCount = 0;

    const deleteSubscriptionEndpoints: string[] = [];

    // Send push notification to each target employee
    const sendPromises = notifications.map(async (target) => {
      const { employeeId, employeeName, uncompletedCount } = target;
      const employeeSubs = subscriptionMap.get(employeeId) || [];

      if (employeeSubs.length === 0) {
        unregisteredEmployees.push(employeeName);
        unregisteredEmployeeIds.push(employeeId);
        return;
      }

      // Format notification payload
      const payload = JSON.stringify({
        title: "안전교육 이수 독려 알림",
        body: `${employeeName} 님 ${uncompletedCount}건의 교육을 이수해주세요.`,
        data: {
          url: "/guard/main",
        },
      });

      // Send to all subscriptions of this employee
      let employeeNotified = false;
      let lastErrorReason = "";
      for (const sub of employeeSubs) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          successCount++;
          employeeNotified = true;
        } catch (err) {
          console.error(`Failed to send push to endpoint ${sub.endpoint}:`, err);
          failedCount++;
          let reason = "알 수 없는 전송 에러";
          if (err instanceof Error) {
            reason = err.message;
          } else if (err && typeof err === "object" && "message" in err) {
            reason = String((err as { message: unknown }).message);
          }

          if (err && typeof err === "object" && "statusCode" in err) {
            const statusCode = (err as { statusCode: number }).statusCode;
            if (statusCode === 410 || statusCode === 404) {
              deleteSubscriptionEndpoints.push(sub.endpoint);
              reason = `기기 토큰 만료 또는 세션 만료 (HTTP ${statusCode})`;
            } else {
              reason = `네트워크/서버 오류 (HTTP ${statusCode})`;
            }
          }
          lastErrorReason = reason;
        }
      }

      if (employeeNotified) {
        notifiedEmployees.push(employeeName);
        notifiedEmployeeIds.push(employeeId);
      } else {
        failedEmployees.push({ employeeId, employeeName, reason: lastErrorReason || "기기 전송 실패" });
      }
    });

    await Promise.all(sendPromises);

    // Clean up expired subscriptions in the background
    if (deleteSubscriptionEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", deleteSubscriptionEndpoints);
    }

    return Response.json({
      success: true,
      successCount,
      failedCount,
      unregisteredCount: unregisteredEmployees.length,
      notifiedEmployees,
      notifiedEmployeeIds,
      unregisteredEmployees,
      unregisteredEmployeeIds,
      failedEmployees,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "알림 발송 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
