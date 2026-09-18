"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { readStoredGuardSession } from "../guard-session-storage";

const guardPushRegistrationStorageKey = "ollbareun.guard.pushRegistration";

type StoredGuardSessionInfo = {
  employeeId: string | null;
  sessionLogId: string | null;
};

type StoredGuardPushRegistration = {
  employeeId: string;
  endpoint: string;
  savedAt: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function maskEndpoint(endpoint: string) {
  if (endpoint.length <= 28) {
    return endpoint;
  }

  return `${endpoint.slice(0, 18)}...${endpoint.slice(-10)}`;
}

function readStoredGuardSessionInfo(): StoredGuardSessionInfo {
  const session = readStoredGuardSession<{ employee?: { id?: unknown }; sessionLogId?: unknown }>({ touch: true });
  return {
    employeeId: typeof session?.employee?.id === "string" ? session.employee.id : null,
    sessionLogId: typeof session?.sessionLogId === "string" ? session.sessionLogId : null,
  };
}

function readStoredGuardPushRegistration(): StoredGuardPushRegistration | null {
  try {
    const stored = window.sessionStorage.getItem(guardPushRegistrationStorageKey);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    if (
      typeof parsed.employeeId !== "string" ||
      typeof parsed.endpoint !== "string" ||
      typeof parsed.savedAt !== "string"
    ) {
      return null;
    }

    return {
      employeeId: parsed.employeeId,
      endpoint: parsed.endpoint,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function writeStoredGuardPushRegistration(input: { employeeId: string; endpoint: string }) {
  try {
    window.sessionStorage.setItem(
      guardPushRegistrationStorageKey,
      JSON.stringify({
        employeeId: input.employeeId,
        endpoint: input.endpoint,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Push registration already succeeded; storage failure should not block the page.
  }
}

async function recordMainPushResult(
  sessionLogId: string | null,
  status: "success" | "warning" | "error" | "skipped",
  result: unknown,
) {
  if (!sessionLogId) {
    return;
  }

  try {
    await fetch(`/api/guard/session-logs/${sessionLogId}/main-push`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, result }),
    });
  } catch (error) {
    console.error("Failed to record guard main push log:", error);
  }
}

export default function GuardPushRegister() {
  const router = useRouter();
  const [showInAppModal, setShowInAppModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalBody, setModalBody] = useState("");
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [showPushErrorModal, setShowPushErrorModal] = useState(false);
  const [pushErrorTitle, setPushErrorTitle] = useState("");
  const [pushErrorBody, setPushErrorBody] = useState("");
  const showPushError = useCallback((title: string, description: string) => {
    setPushErrorTitle(title);
    setPushErrorBody(description);
    setShowPushErrorModal(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function registerPush() {
      const sessionInfo = readStoredGuardSessionInfo();

      // 1. Check support
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        showPushError("푸시 알림을 사용할 수 없음", "이 브라우저는 Service Worker 또는 PushManager를 지원하지 않습니다.");
        console.warn("Push notifications are not supported in this browser.");
        await recordMainPushResult(sessionInfo.sessionLogId, "error", {
          title: "푸시 알림을 사용할 수 없음",
          detail: "Service Worker 또는 PushManager가 지원되지 않습니다.",
          employeeId: sessionInfo.employeeId,
        });
        return;
      }
      // 2. Get employee ID from session
      const employeeId = sessionInfo.employeeId;

      if (!employeeId) {
        console.log("No active guard employee session. Skipping push subscription.");
        await recordMainPushResult(sessionInfo.sessionLogId, "skipped", {
          title: "푸시 알림 등록 건너뜀",
          detail: "로그인한 경비원 세션을 찾지 못해 구독 등록을 진행하지 않았습니다.",
          employeeId,
        });
        return;
      }
      // 3. Register service worker
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered successfully:", registration);
      } catch (err) {
        showPushError(
          "서비스워커 등록 실패",
          err instanceof Error ? err.message : "푸시 알림 수신에 필요한 /sw.js 등록에 실패했습니다.",
        );
        console.error("Service Worker registration failed:", err);
        await recordMainPushResult(sessionInfo.sessionLogId, "error", {
          title: "서비스워커 등록 실패",
          detail: err instanceof Error ? err.message : "서비스워커 등록에 실패했습니다.",
          employeeId,
        });
        return;
      }

      // 4. Request notification permission
      if (Notification.permission === "default") {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            showPushError(
              "알림 권한이 허용되지 않음",
              "브라우저 알림 권한을 허용해야 교육알림 Push를 받을 수 있습니다.",
            );
            console.log("Notification permission denied by user.");
            await recordMainPushResult(sessionInfo.sessionLogId, "warning", {
              title: "알림 권한이 허용되지 않음",
              detail: `사용자가 알림 권한을 ${permission} 상태로 남겼습니다.`,
              employeeId,
            });
            return;
          }
        } catch (err) {
          showPushError(
            "알림 권한 요청 실패",
            err instanceof Error ? err.message : "브라우저 알림 권한 요청 중 오류가 발생했습니다.",
          );
          console.error("Failed to request notification permission:", err);
          await recordMainPushResult(sessionInfo.sessionLogId, "error", {
            title: "알림 권한 요청 실패",
            detail: err instanceof Error ? err.message : "알림 권한 요청에 실패했습니다.",
            employeeId,
          });
          return;
        }
      } else if (Notification.permission === "denied") {
        showPushError("알림 권한 차단됨", "브라우저 설정에서 알림 권한을 다시 허용해야 교육알림 Push를 받을 수 있습니다.");
        console.log("Notification permission was previously denied.");
        await recordMainPushResult(sessionInfo.sessionLogId, "warning", {
          title: "알림 권한 차단됨",
          detail: "브라우저 알림 권한이 차단되어 있습니다.",
          employeeId,
        });
        return;
      }
      // 5. Subscribe or retrieve existing subscription
      try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          showPushError("푸시 알림 설정 오류", "푸시 구독을 생성할 수 없어 알림 연결을 완료하지 못했습니다.");
          console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined in environment variables.");
          await recordMainPushResult(sessionInfo.sessionLogId, "error", {
            title: "VAPID 공개키 누락",
            detail: "NEXT_PUBLIC_VAPID_PUBLIC_KEY가 설정되어 있지 않습니다.",
            employeeId,
          });
          return;
        }

        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        let subscription = await registration.pushManager.getSubscription();

        if (subscription && subscription.options && subscription.options.applicationServerKey) {
          const subscriptionKeyBytes = new Uint8Array(subscription.options.applicationServerKey);
          let keysMatch = applicationServerKey.length === subscriptionKeyBytes.length;
          if (keysMatch) {
            for (let i = 0; i < applicationServerKey.length; i++) {
              if (applicationServerKey[i] !== subscriptionKeyBytes[i]) {
                keysMatch = false;
                break;
              }
            }
          }
          if (!keysMatch) {
            console.log("VAPID public key mismatched. Unsubscribing existing push subscription...");
            await subscription.unsubscribe();
            subscription = null;
          }
        }

        const hadExistingSubscription = Boolean(subscription);

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey,
          });
        }

        // Convert subscription keys to base64
        const subscriptionJson = subscription.toJSON();
        const endpoint = subscriptionJson.endpoint;
        const p256dh = subscriptionJson.keys?.p256dh;
        const auth = subscriptionJson.keys?.auth;

        if (!endpoint || !p256dh || !auth) {
          showPushError("푸시 구독 정보 확인 실패", "브라우저에서 푸시 구독 정보를 받지 못했습니다.");
          console.error("Invalid subscription keys received from PushManager.");
          await recordMainPushResult(sessionInfo.sessionLogId, "error", {
            title: "구독 정보 확인 실패",
            detail: "endpoint, p256dh, auth 중 일부가 비어 있습니다.",
            employeeId,
          });
          return;
        }

        const storedPushRegistration = readStoredGuardPushRegistration();
        const alreadySavedCurrentEndpoint =
          hadExistingSubscription &&
          storedPushRegistration?.employeeId === employeeId &&
          storedPushRegistration.endpoint === endpoint;

        if (alreadySavedCurrentEndpoint) {
          console.log("Push subscription server save skipped because the current endpoint is already cached.");
          return;
        }

        // 6. Send subscription to our server API
        const response = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employeeId,
            subscription: {
              endpoint,
              keys: {
                p256dh,
                auth,
              },
            },
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? `Server returned status ${response.status}`);
        }

        console.log("Push subscription successfully saved to backend.");
        writeStoredGuardPushRegistration({ employeeId, endpoint });
        await recordMainPushResult(sessionInfo.sessionLogId, "success", {
          title: "푸시 알림 연결 완료",
          detail: "교육알림 Push를 받을 수 있도록 현재 브라우저 구독 정보가 저장되었습니다.",
          employeeId,
          endpoint: maskEndpoint(endpoint),
          subscription: hadExistingSubscription ? "existing" : "created",
        });
      } catch (err) {
        showPushError(
          "푸시 알림 연결 실패",
          err instanceof Error ? err.message : "브라우저 구독 생성 또는 서버 저장 중 오류가 발생했습니다.",
        );
        console.error("Failed to subscribe to push notification:", err);
        await recordMainPushResult(sessionInfo.sessionLogId, "error", {
          title: "푸시 알림 연결 실패",
          detail: err instanceof Error ? err.message : "구독 저장에 실패했습니다.",
          employeeId,
        });
      }
    }

    // Wait a bit for the page to settle before requesting permissions
    const timer = setTimeout(() => {
      registerPush();
    }, 1500);

    return () => clearTimeout(timer);
  }, [showPushError]);

  // Listen to in-app messages broadcasted by the Service Worker when app is in the foreground
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED") {
        setModalTitle(event.data.title || "안전교육 독려 알림");
        setModalBody(event.data.body || "");
        setModalUrl(typeof event.data.data?.url === "string" ? event.data.data.url : null);
        setShowInAppModal(true);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  function handleInAppModalClose() {
    setShowInAppModal(false);
    if (modalUrl) {
      router.push(modalUrl);
    }
  }

  return (
    <>
      <AlertModal
        isOpen={showInAppModal}
        onClose={handleInAppModalClose}
        title={modalTitle}
        description={modalBody}
        buttonLabel="확인"
      />

      <AlertModal
        isOpen={showPushErrorModal}
        onClose={() => setShowPushErrorModal(false)}
        title={pushErrorTitle}
        description={pushErrorBody}
        buttonLabel="확인"
      />
    </>
  );
}
