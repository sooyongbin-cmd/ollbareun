"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";
import { readStoredGuardSession } from "../guard-session-storage";
import { getAppPushRegistration, registerAppPushWorker } from "@/lib/app-push-registration";

const guardPushRegistrationStorageKey = "ollbareun.guard.pushRegistration";

type StoredGuardSessionInfo = {
  employeeId: string | null;
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

function readStoredGuardSessionInfo(): StoredGuardSessionInfo {
  const session = readStoredGuardSession<{ employee?: { id?: unknown } }>({ touch: true });
  return {
    employeeId: typeof session?.employee?.id === "string" ? session.employee.id : null,
  };
}

function getNotificationUrl(notification: Notification) {
  const url = (notification.data as { url?: unknown } | null)?.url;
  return typeof url === "string" ? url : null;
}

function getNotificationKey(notification: Notification) {
  const notificationId = (notification.data as { notificationId?: unknown } | null)?.notificationId;
  if (typeof notificationId === "string" && notificationId) {
    return notificationId;
  }

  return [
    notification.timestamp,
    notification.title,
    notification.body,
    getNotificationUrl(notification) ?? "",
  ].join("\u0000");
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

export default function GuardPushRegister() {
  const router = useRouter();
  const pathname = usePathname();
  const [showInAppModal, setShowInAppModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalBody, setModalBody] = useState("");
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [showPushErrorModal, setShowPushErrorModal] = useState(false);
  const [pushErrorTitle, setPushErrorTitle] = useState("");
  const [pushErrorBody, setPushErrorBody] = useState("");
  const notificationQueueRef = useRef<Notification[]>([]);
  const activeNotificationRef = useRef<Notification | null>(null);
  const seenNotificationKeysRef = useRef(new Set<string>());

  const showNextPendingNotification = useCallback(() => {
    if (activeNotificationRef.current) return;

    const notification = notificationQueueRef.current.shift();
    if (!notification) return;

    activeNotificationRef.current = notification;
    setModalTitle(notification.title || "안전교육 독려 알림");
    setModalBody(notification.body || "");
    setModalUrl(getNotificationUrl(notification));
    setShowInAppModal(true);
  }, []);

  const queuePendingNotifications = useCallback((notifications: Notification[]) => {
    notifications
      .slice()
      .sort((left, right) => left.timestamp - right.timestamp)
      .forEach((notification) => {
        const key = getNotificationKey(notification);
        if (seenNotificationKeysRef.current.has(key)) return;

        seenNotificationKeysRef.current.add(key);
        notificationQueueRef.current.push(notification);
      });

    showNextPendingNotification();
  }, [showNextPendingNotification]);

  const checkPendingNotifications = useCallback(async (expectedNotification?: {
    notificationId?: string;
    title?: string;
    body?: string;
    url?: string | null;
  }) => {
    if (
      !("serviceWorker" in navigator) ||
      typeof navigator.serviceWorker.getRegistration !== "function"
    ) {
      return false;
    }

    try {
      const registration = await getAppPushRegistration("guard");
      if (!registration || typeof registration.getNotifications !== "function") {
        return false;
      }

      const notifications = await registration.getNotifications();
      queuePendingNotifications(notifications);
      if (!expectedNotification) return true;

      return notifications.some((notification) => {
        const notificationId = (notification.data as { notificationId?: unknown } | null)?.notificationId;
        if (expectedNotification.notificationId && notificationId === expectedNotification.notificationId) {
          return true;
        }

        return notification.title === expectedNotification.title &&
          notification.body === expectedNotification.body &&
          getNotificationUrl(notification) === expectedNotification.url;
      });
    } catch (error) {
      console.error("Failed to read pending guard push notifications:", error);
      return false;
    }
  }, [queuePendingNotifications]);

  useEffect(() => {
    if (pathname !== "/guard/main") return;

    const checkIfVisible = () => {
      if (document.visibilityState === "visible") {
        void checkPendingNotifications();
      }
    };

    checkIfVisible();
    document.addEventListener("visibilitychange", checkIfVisible);
    window.addEventListener("focus", checkIfVisible);
    window.addEventListener("pageshow", checkIfVisible);

    return () => {
      document.removeEventListener("visibilitychange", checkIfVisible);
      window.removeEventListener("focus", checkIfVisible);
      window.removeEventListener("pageshow", checkIfVisible);
    };
  }, [checkPendingNotifications, pathname]);
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
        return;
      }
      // 2. Get employee ID from session
      const employeeId = sessionInfo.employeeId;

      if (!employeeId) {
        console.log("No active guard employee session. Skipping push subscription.");
        return;
      }
      // 3. Register service worker
      let registration: ServiceWorkerRegistration;
      try {
        registration = await registerAppPushWorker("guard");
        console.log("Service Worker registered successfully:", registration);
      } catch (err) {
        showPushError(
          "서비스워커 등록 실패",
          err instanceof Error ? err.message : "푸시 알림 수신에 필요한 /sw.js 등록에 실패했습니다.",
        );
        console.error("Service Worker registration failed:", err);
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
            return;
          }
        } catch (err) {
          showPushError(
            "알림 권한 요청 실패",
            err instanceof Error ? err.message : "브라우저 알림 권한 요청 중 오류가 발생했습니다.",
          );
          console.error("Failed to request notification permission:", err);
          return;
        }
      } else if (Notification.permission === "denied") {
        showPushError("알림 권한 차단됨", "브라우저 설정에서 알림 권한을 다시 허용해야 교육알림 Push를 받을 수 있습니다.");
        console.log("Notification permission was previously denied.");
        return;
      }
      // 5. Subscribe or retrieve existing subscription
      try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          showPushError("푸시 알림 설정 오류", "푸시 구독을 생성할 수 없어 알림 연결을 완료하지 못했습니다.");
          console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined in environment variables.");
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
      } catch (err) {
        showPushError(
          "푸시 알림 연결 실패",
          err instanceof Error ? err.message : "브라우저 구독 생성 또는 서버 저장 중 오류가 발생했습니다.",
        );
        console.error("Failed to subscribe to push notification:", err);
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
        void checkPendingNotifications({
          notificationId: typeof event.data.notificationId === "string" ? event.data.notificationId : undefined,
          title: typeof event.data.title === "string" ? event.data.title : undefined,
          body: typeof event.data.body === "string" ? event.data.body : undefined,
          url: typeof event.data.data?.url === "string" ? event.data.data.url : null,
        }).then((notificationIsActive) => {
          if (notificationIsActive) return;

          setModalTitle(event.data.title || "안전교육 독려 알림");
          setModalBody(event.data.body || "");
          setModalUrl(typeof event.data.data?.url === "string" ? event.data.data.url : null);
          setShowInAppModal(true);
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, [checkPendingNotifications]);

  function handleInAppModalClose() {
    activeNotificationRef.current?.close();
    activeNotificationRef.current = null;
    setShowInAppModal(false);
    if (modalUrl) {
      router.push(modalUrl);
    }
    window.setTimeout(showNextPendingNotification, 0);
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
