import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { notificationBranding } from "@/lib/notification-branding";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Custom push event listener for handling Web Push Notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "올바름 관리시스템";
    const notificationData =
      data.data && typeof data.data === "object" && !Array.isArray(data.data)
        ? data.data
        : {};
    const notificationId =
      typeof notificationData.notificationId === "string"
        ? notificationData.notificationId
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const savedNotificationData = { ...notificationData, notificationId };
    const options = {
      body: data.body || "",
      badge: data.badge || notificationBranding.badge,
      data: savedNotificationData,
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(title, options).then(() =>
        // Let visible app windows read the notification from the service worker registration.
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
          windowClients.forEach((client) => {
            if (client.visibilityState === "visible" && client.url.startsWith(self.registration.scope)) {
              client.postMessage({
                type: "PUSH_NOTIFICATION_RECEIVED",
                title,
                body: options.body,
                notificationId,
                data: options.data,
              });
            }
          });
        }),
      ),
    );
  } catch (err) {
    console.error("Error parsing push notification data:", err);
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("올바름 관리시스템", {
        body: text,
        badge: notificationBranding.badge,
      })
    );
  }
});

async function openNotification(event: NotificationEvent) {
  const notificationUrl = event.notification.data?.url || "/guard/main";
  const targetUrl = new URL(notificationUrl, self.location.origin).href;
  // Notification destinations must stay within this application.
  if (new URL(targetUrl).origin !== self.location.origin) return;

  let openInNewWindow = false;
  try {
    const response = await fetch("/api/notifications/click-policy", {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (response.ok) {
      openInNewWindow = (await response.json()).openInNewWindow === true;
    }
  } catch {
    // An unavailable setting uses the configured default behavior (N).
  }

  if (!openInNewWindow) {
    const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const managers = windowClients.filter((client) => {
      const url = new URL(client.url);
      return url.origin === self.location.origin
        && (url.pathname === "/manager" || url.pathname.startsWith("/manager/"))
        && url.pathname !== "/manager/auth";
    }).sort((a, b) => Number(b.focused) - Number(a.focused)
      || Number(b.visibilityState === "visible") - Number(a.visibilityState === "visible"));
    for (const manager of managers) {
      try {
        await manager.focus();
        const delivered = await new Promise<boolean>((resolve) => {
          const channel = new MessageChannel();
          const finish = (received: boolean) => {
            clearTimeout(timeout);
            channel.port1.close();
            channel.port2.close();
            resolve(received);
          };
          const timeout = setTimeout(() => finish(false), 1000);
          channel.port1.onmessage = () => finish(true);
          try {
            manager.postMessage({
              type: "PUSH_NOTIFICATION_CLICKED",
              url: targetUrl,
              title: event.notification.title,
              body: event.notification.body,
            }, [channel.port2]);
          } catch {
            finish(false);
          }
        });
        if (delivered) return;
      } catch {
        // A closing or unfocusable window must not swallow the notification.
      }
    }
  }
  return self.clients.openWindow(targetUrl);
}

// Custom notificationclick listener for handling the system's window policy.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(openNotification(event));
});

serwist.addEventListeners();
