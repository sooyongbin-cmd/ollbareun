// Service Worker for handling Web Push Notifications

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "올바른 관리시스템";
    const options = {
      body: data.body || "",
      icon: data.icon || "/guard-icon.svg",
      badge: data.badge || "/guard-icon.svg",
      data: data.data || {},
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));

    // Post message to active, visible client windows (foreground app)
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        windowClients.forEach((client) => {
          if (client.visibilityState === "visible") {
            client.postMessage({
              type: "PUSH_NOTIFICATION_RECEIVED",
              title,
              body: options.body,
              data: options.data,
            });
          }
        });
      }),
    );
  } catch (err) {
    console.error("Error parsing push notification data:", err);
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("올바른 관리시스템", {
        body: text,
        icon: "/guard-icon.svg",
        badge: "/guard-icon.svg",
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Redirect to guard main dashboard page when clicking notification
  const targetUrl = new URL("/guard/main", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with the dashboard url
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
