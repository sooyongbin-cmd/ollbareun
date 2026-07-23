import { getManagerUserWithRole } from "@/lib/manager-auth";
import {
  saveManagerPushSubscription,
  type ManagerPushSubscriptionInput,
} from "@/lib/manager-push-notifications";

function isValidSubscription(value: unknown): value is ManagerPushSubscriptionInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const subscription = value as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };

  return (
    typeof subscription.endpoint === "string" &&
    subscription.endpoint.trim() !== "" &&
    typeof subscription.keys?.p256dh === "string" &&
    subscription.keys.p256dh.trim() !== "" &&
    typeof subscription.keys?.auth === "string" &&
    subscription.keys.auth.trim() !== ""
  );
}

export async function POST(request: Request) {
  try {
    const authInfo = await getManagerUserWithRole();
    if (!authInfo) {
      return Response.json({ error: "관리자 인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (!isValidSubscription(body.subscription)) {
      return Response.json({ error: "유효한 푸시 구독 정보가 필요합니다." }, { status: 400 });
    }

    const subscription = await saveManagerPushSubscription(authInfo.user.id, body.subscription);
    return Response.json({ success: true, subscription });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "관리자 푸시 구독 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
