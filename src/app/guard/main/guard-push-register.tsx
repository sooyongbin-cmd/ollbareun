"use client";

import { useEffect, useState } from "react";
import AlertModal from "@/components/modals/alert-modal";

const guardSessionStorageKey = "ollbareun.guard.session";

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

export default function GuardPushRegister() {
  const [showInAppModal, setShowInAppModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalBody, setModalBody] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    async function registerPush() {
      // 1. Check support
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push notifications are not supported in this browser.");
        return;
      }

      // 2. Get employee ID from session
      let employeeId: string | null = null;
      try {
        const stored = window.sessionStorage.getItem(guardSessionStorageKey);
        if (stored) {
          const session = JSON.parse(stored);
          employeeId = typeof session.employee?.id === "string" ? session.employee.id : null;
        }
      } catch (err) {
        console.error("Error reading guard session for push registration:", err);
      }

      if (!employeeId) {
        console.log("No active guard employee session. Skipping push subscription.");
        return;
      }

      // 3. Register service worker
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.register("/sw.js");
        console.log("Service Worker registered successfully:", registration);
      } catch (err) {
        console.error("Service Worker registration failed:", err);
        return;
      }

      // 4. Request notification permission
      if (Notification.permission === "default") {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            console.log("Notification permission denied by user.");
            return;
          }
        } catch (err) {
          console.error("Failed to request notification permission:", err);
          return;
        }
      } else if (Notification.permission === "denied") {
        console.log("Notification permission was previously denied.");
        return;
      }

      // 5. Subscribe or retrieve existing subscription
      try {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not defined in environment variables.");
          return;
        }

        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        let subscription = await registration.pushManager.getSubscription();

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
          console.error("Invalid subscription keys received from PushManager.");
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
          throw new Error(`Server returned status ${response.status}`);
        }

        console.log("Push subscription successfully saved to backend.");
      } catch (err) {
        console.error("Failed to subscribe to push notification:", err);
      }
    }

    // Wait a bit for the page to settle before requesting permissions
    const timer = setTimeout(() => {
      registerPush();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

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
    <AlertModal
      isOpen={showInAppModal}
      onClose={() => setShowInAppModal(false)}
      title={modalTitle}
      description={modalBody}
      buttonLabel="확인"
    />
  );
}
