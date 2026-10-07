"use client";

import { useEffect, useState } from "react";
import AlertModal from "@/components/modals/alert-modal";

type ClickedNotification = { title: string; body: string };

export default function ManagerNotificationClick() {
  const [notifications, setNotifications] = useState<ClickedNotification[]>([]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const receiveNotification = (event: MessageEvent) => {
      if (event.origin && event.origin !== window.location.origin) return;
      if (event.data?.type !== "PUSH_NOTIFICATION_CLICKED") return;
      const title = typeof event.data.title === "string" ? event.data.title : "알림";
      const body = typeof event.data.body === "string" ? event.data.body : "";
      setNotifications((pending) => [...pending, { title, body }]);
      event.ports?.[0]?.postMessage({ received: true });
    };
    navigator.serviceWorker.addEventListener("message", receiveNotification);
    return () => navigator.serviceWorker.removeEventListener("message", receiveNotification);
  }, []);

  const notification = notifications[0];
  return (
    <AlertModal
      isOpen={Boolean(notification)}
      title={notification?.title ?? "알림"}
      description={notification?.body}
      onClose={() => setNotifications((pending) => pending.slice(1))}
    />
  );
}
