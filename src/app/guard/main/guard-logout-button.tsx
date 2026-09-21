"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PowerIcon } from "@/components/icons/power-icon";
import { LogoutIcon } from "@/components/icons/logout-icon";
import { clearStoredGuardSession, readStoredGuardSession } from "../guard-session-storage";
import { getSupabasePasskeyClient } from "@/lib/supabase-passkey-client";

const guardLogoutPushResultStorageKey = "ollbareun.guard.logout.pushResult";
const guardPushRegistrationStorageKey = "ollbareun.guard.pushRegistration";

type LogoutPushResult = {
  completedAt: string;
  employeeId: string | null;
  sessionLogId?: string | null;
  endpoint: string | null;
  browserSubscription: "removed" | "not-found" | "unsupported" | "failed";
  serverSubscription: "removed" | "not-found" | "skipped" | "failed";
  session: "removed" | "failed";
};

function readGuardSessionInfo() {
  const session = readStoredGuardSession<{ employee?: { id?: unknown }; sessionLogId?: unknown }>();
  return {
    employeeId: typeof session?.employee?.id === "string" ? session.employee.id : null,
    sessionLogId: typeof session?.sessionLogId === "string" ? session.sessionLogId : null,
  };
}

async function getCurrentPushEndpoint() {
  if (!("serviceWorker" in navigator)) {
    return { endpoint: null, status: "unsupported" as const };
  }

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  const endpoint = subscription?.endpoint ?? null;

  if (subscription) {
    await subscription.unsubscribe();
    return { endpoint, status: "removed" as const };
  }

  return { endpoint, status: "not-found" as const };
}

function writeLogoutPushResult(result: LogoutPushResult) {
  try {
    window.sessionStorage.setItem(guardLogoutPushResultStorageKey, JSON.stringify(result));
  } catch {
    // The logout navigation should continue even if storage is unavailable.
  }
}

function clearPushRegistrationCache() {
  try {
    window.sessionStorage.removeItem(guardPushRegistrationStorageKey);
  } catch {
    // The logout navigation should continue even if storage is unavailable.
  }
}

async function recordLogoutResult(sessionLogId: string | null, result: LogoutPushResult) {
  if (!sessionLogId) {
    return;
  }

  try {
    await fetch(`/api/guard/session-logs/${sessionLogId}/logout`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        browserPushStatus: result.browserSubscription,
        serverPushStatus: result.serverSubscription,
        sessionStatus: result.session,
        result,
      }),
    });
  } catch (error) {
    console.error("Failed to record guard logout log:", error);
  }
}

type GuardLogoutButtonProps = {
  ariaLabel?: string;
  className?: string;
  icon?: "logout" | "power";
  iconSize?: number | string;
  label?: string;
  showIcon?: boolean;
  variant?: "default" | "outline";
};

export default function GuardLogoutButton({
  ariaLabel,
  className,
  icon = "power",
  iconSize = 24,
  label = "로그아웃",
  showIcon = true,
  variant = "outline",
}: GuardLogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    const { employeeId, sessionLogId } = readGuardSessionInfo();
    let endpoint: string | null = null;
    let browserSubscription: LogoutPushResult["browserSubscription"] = "not-found";
    let serverSubscription: LogoutPushResult["serverSubscription"] = "skipped";
    let session: LogoutPushResult["session"] = "removed";

    try {
      const pushResult = await getCurrentPushEndpoint();
      endpoint = pushResult.endpoint;
      browserSubscription = pushResult.status;
    } catch (error) {
      browserSubscription = "failed";
      console.error("Failed to unsubscribe browser push subscription:", error);
    }

    if (employeeId) {
      try {
        const response = await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId, endpoint }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          serverSubscription = "failed";
        } else {
          serverSubscription = payload?.deletedCount > 0 ? "removed" : "not-found";
        }
      } catch (error) {
        serverSubscription = "failed";
        console.error("Failed to remove push subscription from backend:", error);
      }
    }

    try {
      await getSupabasePasskeyClient().auth.signOut();
    } catch (error) {
      console.error("Failed to clear guard passkey session:", error);
    }

    try {
      clearStoredGuardSession();
      clearPushRegistrationCache();
    } catch {
      session = "failed";
      // Navigation below still completes logout for browsers with unavailable storage.
    }

    const logoutResult = {
      completedAt: new Date().toISOString(),
      employeeId,
      sessionLogId,
      endpoint,
      browserSubscription,
      serverSubscription,
      session,
    };

    await recordLogoutResult(sessionLogId, logoutResult);
    writeLogoutPushResult(logoutResult);

    router.push("/guard");
  }

  return (
    <Button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onClick={handleLogout}
      variant={variant}
    >
      {showIcon ? (
        icon === "logout"
          ? <LogoutIcon size={iconSize} className="lucide lucide-log-out" />
          : <PowerIcon size={iconSize} className="lucide lucide-power" />
      ) : null}
      <span>{label}</span>
    </Button>
  );
}
