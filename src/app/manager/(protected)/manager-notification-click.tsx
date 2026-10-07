"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlertModal from "@/components/modals/alert-modal";

type ClickedNotification = { title: string; body: string; url: string | null };

export default function ManagerNotificationClick() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<ClickedNotification[]>([]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const serviceWorker = navigator.serviceWorker;
    const receiveNotification = (event: MessageEvent) => {
      if (event.origin && event.origin !== window.location.origin) return;
      if (event.data?.type !== "PUSH_NOTIFICATION_CLICKED") return;
      const title = typeof event.data.title === "string" ? event.data.title : "알림";
      const body = typeof event.data.body === "string" ? event.data.body : "";
      let url: string | null = null;
      if (typeof event.data.url === "string") {
        try {
          const target = new URL(event.data.url, window.location.origin);
          if (target.origin === window.location.origin) url = target.pathname + target.search + target.hash;
        } catch {
          // A malformed destination must not prevent displaying the message.
        }
      }
      setNotifications((pending) => [...pending, { title, body, url }]);
      event.ports?.[0]?.postMessage({ received: true });
    };
    serviceWorker.addEventListener("message", receiveNotification);
    return () => serviceWorker.removeEventListener("message", receiveNotification);
  }, []);

  const notification = notifications[0];
  return (
    <AlertModal
      isOpen={Boolean(notification)}
      title={notification?.title ?? "알림"}
      description={notification?.body}
      onClose={() => {
        setNotifications((pending) => pending.slice(1));
        if (notification?.url) router.push(notification.url);
      }}
    />
  );
}
