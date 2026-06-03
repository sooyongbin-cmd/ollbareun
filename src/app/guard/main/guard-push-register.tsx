"use client";

import { useCallback, useEffect, useState } from "react";
import AlertModal from "@/components/modals/alert-modal";

const guardSessionStorageKey = "ollbareun.guard.session";

type PushStepStatus = "waiting" | "running" | "success" | "warning" | "error";

type PushStep = {
  id: string;
  label: string;
  detail: string;
  status: PushStepStatus;
};

type StoredGuardSessionInfo = {
  employeeId: string | null;
  sessionLogId: string | null;
};

const initialPushSteps: PushStep[] = [
  {
    id: "support",
    label: "브라우저 지원 확인",
    detail: "Service Worker와 PushManager 사용 가능 여부를 확인합니다.",
    status: "waiting",
  },
  {
    id: "session",
    label: "로그인 세션 확인",
    detail: "현재 로그인한 경비원 직원 ID를 확인합니다.",
    status: "waiting",
  },
  {
    id: "service-worker",
    label: "서비스워커 등록",
    detail: "/sw.js를 등록해 백그라운드 알림 수신 준비를 합니다.",
    status: "waiting",
  },
  {
    id: "permission",
    label: "알림 권한 확인",
    detail: "브라우저 알림 권한이 허용되어 있는지 확인합니다.",
    status: "waiting",
  },
  {
    id: "subscription",
    label: "푸시 구독 확인",
    detail: "기존 endpoint를 확인하고 없으면 새 구독을 생성합니다.",
    status: "waiting",
  },
  {
    id: "save",
    label: "서버 저장",
    detail: "Supabase push_subscriptions 테이블에 구독 정보를 저장합니다.",
    status: "waiting",
  },
];

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

function getStepBadgeClass(status: PushStepStatus) {
  if (status === "success") {
    return "bg-primary/10 text-primary";
  }
  if (status === "running") {
    return "bg-status-warn/10 text-status-warn";
  }
  if (status === "warning") {
    return "bg-canvas text-ink-muted-48";
  }
  if (status === "error") {
    return "bg-status-warn/15 text-status-warn";
  }
  return "bg-canvas text-ink-muted-48";
}

function getStepStatusLabel(status: PushStepStatus) {
  if (status === "success") return "완료";
  if (status === "running") return "진행중";
  if (status === "warning") return "확인필요";
  if (status === "error") return "실패";
  return "대기";
}

function readStoredGuardSessionInfo(): StoredGuardSessionInfo {
  try {
    const stored = window.sessionStorage.getItem(guardSessionStorageKey);
    if (!stored) {
      return { employeeId: null, sessionLogId: null };
    }

    const session = JSON.parse(stored);
    return {
      employeeId: typeof session.employee?.id === "string" ? session.employee.id : null,
      sessionLogId: typeof session.sessionLogId === "string" ? session.sessionLogId : null,
    };
  } catch (err) {
    console.error("Error reading guard session for push registration:", err);
    return { employeeId: null, sessionLogId: null };
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
  const [showInAppModal, setShowInAppModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalBody, setModalBody] = useState("");
  const [pushStatusTitle, setPushStatusTitle] = useState("푸시 알림 연결 준비 중");
  const [pushStatusDetail, setPushStatusDetail] = useState(
    "로그인 이후 교육알림 수신을 위한 브라우저 구독 상태를 확인합니다.",
  );
  const [pushSteps, setPushSteps] = useState<PushStep[]>(initialPushSteps);

  const updateStep = useCallback((id: string, status: PushStepStatus, detail: string) => {
    setPushSteps((currentSteps) =>
      currentSteps.map((step) => (step.id === id ? { ...step, status, detail } : step)),
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function registerPush() {
      const sessionInfo = readStoredGuardSessionInfo();

      // 1. Check support
      updateStep("support", "running", "현재 브라우저의 Web Push 지원 여부를 확인하는 중입니다.");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushStatusTitle("푸시 알림을 사용할 수 없음");
        setPushStatusDetail("이 브라우저는 Service Worker 또는 PushManager를 지원하지 않습니다.");
        updateStep("support", "error", "Service Worker 또는 PushManager가 지원되지 않습니다.");
        console.warn("Push notifications are not supported in this browser.");
        await recordMainPushResult(sessionInfo.sessionLogId, "error", {
          title: "푸시 알림을 사용할 수 없음",
          detail: "Service Worker 또는 PushManager가 지원되지 않습니다.",
          employeeId: sessionInfo.employeeId,
        });
        return;
      }
      updateStep("support", "success", "Service Worker와 PushManager를 사용할 수 있습니다.");

      // 2. Get employee ID from session
      updateStep("session", "running", "sessionStorage에서 로그인한 경비원 세션을 확인하는 중입니다.");
      const employeeId = sessionInfo.employeeId;

      if (!employeeId) {
        setPushStatusTitle("푸시 알림 등록 건너뜀");
        setPushStatusDetail("로그인한 경비원 세션을 찾지 못해 구독 등록을 진행하지 않았습니다.");
        updateStep("session", "warning", "직원 ID가 포함된 경비원 세션이 없습니다.");
        console.log("No active guard employee session. Skipping push subscription.");
        await recordMainPushResult(sessionInfo.sessionLogId, "skipped", {
          title: "푸시 알림 등록 건너뜀",
          detail: "로그인한 경비원 세션을 찾지 못해 구독 등록을 진행하지 않았습니다.",
          employeeId,
        });
        return;
      }
      updateStep("session", "success", `직원 ID ${employeeId} 세션을 확인했습니다.`);

      // 3. Register service worker
      updateStep("service-worker", "running", "/sw.js 서비스워커를 등록하는 중입니다.");
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.register("/sw.js");
        updateStep("service-worker", "success", "/sw.js 서비스워커가 등록되었습니다.");
        console.log("Service Worker registered successfully:", registration);
      } catch (err) {
        setPushStatusTitle("서비스워커 등록 실패");
        setPushStatusDetail("푸시 알림 수신에 필요한 /sw.js 등록에 실패했습니다.");
        updateStep("service-worker", "error", err instanceof Error ? err.message : "서비스워커 등록에 실패했습니다.");
        console.error("Service Worker registration failed:", err);
        await recordMainPushResult(sessionInfo.sessionLogId, "error", {
          title: "서비스워커 등록 실패",
          detail: err instanceof Error ? err.message : "서비스워커 등록에 실패했습니다.",
          employeeId,
        });
        return;
      }

      // 4. Request notification permission
      updateStep("permission", "running", `현재 알림 권한 상태는 ${Notification.permission}입니다.`);
      if (Notification.permission === "default") {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setPushStatusTitle("알림 권한이 허용되지 않음");
            setPushStatusDetail("브라우저 알림 권한을 허용해야 교육알림 Push를 받을 수 있습니다.");
            updateStep("permission", "warning", `사용자가 알림 권한을 ${permission} 상태로 남겼습니다.`);
            console.log("Notification permission denied by user.");
            await recordMainPushResult(sessionInfo.sessionLogId, "warning", {
              title: "알림 권한이 허용되지 않음",
              detail: `사용자가 알림 권한을 ${permission} 상태로 남겼습니다.`,
              employeeId,
            });
            return;
          }
        } catch (err) {
          setPushStatusTitle("알림 권한 요청 실패");
          setPushStatusDetail("브라우저 알림 권한 요청 중 오류가 발생했습니다.");
          updateStep("permission", "error", err instanceof Error ? err.message : "알림 권한 요청에 실패했습니다.");
          console.error("Failed to request notification permission:", err);
          await recordMainPushResult(sessionInfo.sessionLogId, "error", {
            title: "알림 권한 요청 실패",
            detail: err instanceof Error ? err.message : "알림 권한 요청에 실패했습니다.",
            employeeId,
          });
          return;
        }
      } else if (Notification.permission === "denied") {
        setPushStatusTitle("알림 권한 차단됨");
        setPushStatusDetail("브라우저 설정에서 알림 권한을 다시 허용해야 교육알림 Push를 받을 수 있습니다.");
        updateStep("permission", "warning", "브라우저 알림 권한이 차단되어 있습니다.");
        console.log("Notification permission was previously denied.");
        await recordMainPushResult(sessionInfo.sessionLogId, "warning", {
          title: "알림 권한 차단됨",
          detail: "브라우저 알림 권한이 차단되어 있습니다.",
          employeeId,
        });
        return;
      }
      updateStep("permission", "success", "브라우저 알림 권한이 허용되어 있습니다.");

      // 5. Subscribe or retrieve existing subscription
      try {
        updateStep("subscription", "running", "VAPID 공개키와 기존 브라우저 구독 정보를 확인하는 중입니다.");
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          setPushStatusTitle("VAPID 공개키 누락");
          setPushStatusDetail("NEXT_PUBLIC_VAPID_PUBLIC_KEY 환경변수가 없어 푸시 구독을 생성할 수 없습니다.");
          updateStep("subscription", "error", "NEXT_PUBLIC_VAPID_PUBLIC_KEY가 설정되어 있지 않습니다.");
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
        const hadExistingSubscription = Boolean(subscription);

        if (!subscription) {
          updateStep("subscription", "running", "기존 구독이 없어 새 Push subscription을 생성하는 중입니다.");
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
          setPushStatusTitle("구독 정보 확인 실패");
          setPushStatusDetail("브라우저에서 endpoint 또는 암호화 키를 받지 못했습니다.");
          updateStep("subscription", "error", "endpoint, p256dh, auth 중 일부가 비어 있습니다.");
          console.error("Invalid subscription keys received from PushManager.");
          await recordMainPushResult(sessionInfo.sessionLogId, "error", {
            title: "구독 정보 확인 실패",
            detail: "endpoint, p256dh, auth 중 일부가 비어 있습니다.",
            employeeId,
          });
          return;
        }
        updateStep(
          "subscription",
          "success",
          `${hadExistingSubscription ? "기존" : "신규"} endpoint를 확인했습니다: ${maskEndpoint(endpoint)}`,
        );

        // 6. Send subscription to our server API
        updateStep("save", "running", "구독 정보를 /api/notifications/subscribe로 저장하는 중입니다.");
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

        setPushStatusTitle("푸시 알림 연결 완료");
        setPushStatusDetail("교육알림 Push를 받을 수 있도록 현재 브라우저 구독 정보가 저장되었습니다.");
        updateStep("save", "success", "Supabase push_subscriptions 테이블에 구독 정보를 저장했습니다.");
        console.log("Push subscription successfully saved to backend.");
        await recordMainPushResult(sessionInfo.sessionLogId, "success", {
          title: "푸시 알림 연결 완료",
          detail: "교육알림 Push를 받을 수 있도록 현재 브라우저 구독 정보가 저장되었습니다.",
          employeeId,
          endpoint: maskEndpoint(endpoint),
          subscription: hadExistingSubscription ? "existing" : "created",
        });
      } catch (err) {
        setPushStatusTitle("푸시 알림 연결 실패");
        setPushStatusDetail("브라우저 구독 생성 또는 서버 저장 중 오류가 발생했습니다.");
        updateStep("save", "error", err instanceof Error ? err.message : "구독 저장에 실패했습니다.");
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
  }, [updateStep]);

  // Listen to in-app messages broadcasted by the Service Worker when app is in the foreground
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED") {
        setModalTitle(event.data.title || "안전교육 독려 알림");
        setModalBody(event.data.body || "");
        setShowInAppModal(true);
      }
    };

    navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  return (
    <>
      <section className="mb-6 bg-canvas-parchment rounded-[18px] p-[24px] border border-hairline/50">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-primary">Push 알림</p>
          <h3 className="text-[21px] font-semibold">{pushStatusTitle}</h3>
          <p className="text-[14px] leading-relaxed text-ink-muted-48">{pushStatusDetail}</p>
        </div>

        <ol className="mt-5 grid gap-3">
          {pushSteps.map((step) => (
            <li
              key={step.id}
              className="grid gap-2 rounded-[12px] border border-hairline/40 bg-canvas px-4 py-3 md:grid-cols-[150px_1fr_auto] md:items-center"
            >
              <span className="text-[14px] font-semibold text-ink">{step.label}</span>
              <span className="text-[13px] leading-relaxed text-ink-muted-48">{step.detail}</span>
              <span
                className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[12px] font-semibold ${getStepBadgeClass(step.status)}`}
              >
                {getStepStatusLabel(step.status)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <AlertModal
        isOpen={showInAppModal}
        onClose={() => setShowInAppModal(false)}
        title={modalTitle}
        description={modalBody}
        buttonLabel="확인"
      />
    </>
  );
}
