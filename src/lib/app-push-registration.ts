export const appPushScopes = {
  guard: "/guard/",
  manager: "/manager/",
} as const;

// Chrome uses the notification's service-worker scope to find the installed app.
// The root registration is shared by legacy clients and must not be unsubscribed.
export async function registerAppPushWorker(app: keyof typeof appPushScopes) {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: appPushScopes[app],
    updateViaCache: "none",
  });

  if (registration.active?.state === "activated") return registration;

  // navigator.serviceWorker.ready could resolve to the old root registration.
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error("알림 서비스워커를 시작하지 못했습니다. 다시 접속해 주세요.");

  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      worker.removeEventListener("statechange", checkState);
      if (error) reject(error);
      else resolve();
    };
    const checkState = () => {
      if (worker.state === "activated") finish();
      else if (worker.state === "redundant") {
        finish(new Error("알림 서비스워커 활성화에 실패했습니다. 다시 접속해 주세요."));
      }
    };
    const timeout = setTimeout(() => {
      finish(new Error("알림 연결 시간이 초과되었습니다. 다시 접속해 주세요."));
    }, 60_000);
    worker.addEventListener("statechange", checkState);
    checkState();
  });

  return registration;
}

export async function getLegacyPushEndpoint() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (registration?.scope !== new URL("/", window.location.origin).href) return undefined;
  return (await registration.pushManager.getSubscription())?.endpoint;
}

export async function getAppPushRegistration(app: keyof typeof appPushScopes) {
  const scope = appPushScopes[app];
  const registration = await navigator.serviceWorker.getRegistration(scope);
  return registration?.scope === new URL(scope, window.location.origin).href
    ? registration
    : undefined;
}
