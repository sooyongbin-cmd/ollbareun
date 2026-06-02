"use client";

import { useRouter } from "next/navigation";
import { PowerIcon } from "@/components/icons/power-icon";

const guardSessionStorageKey = "ollbareun.guard.session";

function readEmployeeIdFromSession() {
  try {
    const stored = window.sessionStorage.getItem(guardSessionStorageKey);
    if (!stored) return null;

    const session = JSON.parse(stored);
    return typeof session.employee?.id === "string" ? session.employee.id : null;
  } catch {
    return null;
  }
}

async function getCurrentPushEndpoint() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint ?? null;

  if (subscription) {
    await subscription.unsubscribe();
  }

  return endpoint;
}

export default function GuardLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const employeeId = readEmployeeIdFromSession();
    let endpoint: string | null = null;

    try {
      endpoint = await getCurrentPushEndpoint();
    } catch (error) {
      console.error("Failed to unsubscribe browser push subscription:", error);
    }

    if (employeeId) {
      try {
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId, endpoint }),
        });
      } catch (error) {
        console.error("Failed to remove push subscription from backend:", error);
      }
    }

    try {
      window.sessionStorage.removeItem(guardSessionStorageKey);
    } catch {
      // Navigation below still completes logout for browsers with unavailable storage.
    }

    router.push("/guard");
  }

  return (
    <button
      type="button"
      aria-label="로그아웃"
      className="button-secondary inline-flex h-11 w-11 items-center justify-center !p-0"
      onClick={handleLogout}
    >
      <PowerIcon size={24} className="lucide lucide-power" />
    </button>
  );
}
