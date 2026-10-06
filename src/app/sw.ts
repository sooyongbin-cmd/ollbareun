import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { notificationBranding } from "@/lib/notification-branding";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

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

// Custom notificationclick listener for handling redirect action
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationUrl = event.notification.data?.url || "/guard/main";
  const targetUrl = new URL(notificationUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with the dashboard url
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

serwist.addEventListeners();
