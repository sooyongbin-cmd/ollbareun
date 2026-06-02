"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GpsInfo } from "@/lib/gps";
import AlertModal from "@/components/modals/alert-modal";
import { isCurrentInAppBrowser, isStandaloneGuardApp } from "./in-app-browser";
import InAppBrowserGuide from "./in-app-browser-guide";
import GuardBrowserGate from "./guard-browser-gate";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  is_retired: boolean;
};

type WorksiteRow = {
  id: string;
  name: string;
  gps_info: GpsInfo;
  radius_meters: number;
};

type AssignmentRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

type GuardSession = {
  employee: EmployeeRow;
  assignment: AssignmentRow | null;
  worksite: WorksiteRow | null;
  attendance: AttendanceRow | null;
};

type LogoutPushResult = {
  completedAt: string;
  employeeId: string | null;
  endpoint: string | null;
  browserSubscription: "removed" | "not-found" | "unsupported" | "failed";
  serverSubscription: "removed" | "not-found" | "skipped" | "failed";
  session: "removed" | "failed";
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

type GuardLaunchState = "checking" | "in-app" | "standalone" | "installable-browser" | "browser-installed-or-unavailable";

const guardNameStorageKey = "ollbareun.guard.name";
const guardSessionStorageKey = "ollbareun.guard.session";
const guardLogoutPushResultStorageKey = "ollbareun.guard.logout.pushResult";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  }

  return payload as T;
}

function readStoredGuardName() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(guardNameStorageKey) ?? "";
  } catch {
    return "";
  }
}

function writeStoredGuardName(name: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(guardNameStorageKey, name);
  } catch {
    // Keep authentication usable when storage is unavailable.
  }
}

function writeStoredGuardSession(session: GuardSession) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(guardSessionStorageKey, JSON.stringify(session));
  } catch {
    // Navigation can still continue; the main page will ask for login again if storage fails.
  }
}

function hasStoredGuardSession() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = window.sessionStorage.getItem(guardSessionStorageKey);
    if (!stored) return false;

    const session = JSON.parse(stored);
    return typeof session.employee?.id === "string" && session.employee.id.trim() !== "";
  } catch {
    return false;
  }
}

function readLogoutPushResult(): LogoutPushResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(guardLogoutPushResultStorageKey);
    if (!stored) return null;
    return JSON.parse(stored) as LogoutPushResult;
  } catch {
    return null;
  }
}

function formatLogoutResultTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ko-KR");
}

function maskEndpoint(endpoint: string | null) {
  if (!endpoint) {
    return "확인된 endpoint 없음";
  }
  if (endpoint.length <= 28) {
    return endpoint;
  }

  return `${endpoint.slice(0, 18)}...${endpoint.slice(-10)}`;
}

function getBrowserSubscriptionText(status: LogoutPushResult["browserSubscription"]) {
  if (status === "removed") return "브라우저 Push 구독 해제 완료";
  if (status === "not-found") return "현재 브라우저에 해제할 Push 구독 없음";
  if (status === "unsupported") return "현재 브라우저가 Service Worker를 지원하지 않음";
  return "브라우저 Push 구독 해제 실패";
}

function getServerSubscriptionText(status: LogoutPushResult["serverSubscription"]) {
  if (status === "removed") return "Supabase 구독정보 삭제 완료";
  if (status === "not-found") return "삭제할 Supabase 구독정보 없음";
  if (status === "skipped") return "직원 ID가 없어 서버 삭제 요청 생략";
  return "Supabase 구독정보 삭제 실패";
}

function getSessionText(status: LogoutPushResult["session"]) {
  if (status === "removed") return "로그인 세션 삭제 완료";
  return "로그인 세션 삭제 실패";
}

export default function GuardPage() {
  const router = useRouter();
  const [savedGuardName, setSavedGuardName] = useState(readStoredGuardName);
  const [logoutPushResult] = useState(readLogoutPushResult);
  const [errorMessage, setErrorMessage] = useState("");
  const [launchState, setLaunchState] = useState<GuardLaunchState>("checking");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isCurrentInAppBrowser()) {
      const timer = setTimeout(() => {
        setLaunchState("in-app");
      }, 0);

      return () => clearTimeout(timer);
    }

    if (isStandaloneGuardApp()) {
      const timer = setTimeout(() => {
        setLaunchState("standalone");
      }, 0);

      return () => clearTimeout(timer);
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setLaunchState("installable-browser");
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setLaunchState("browser-installed-or-unavailable");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timer = setTimeout(() => {
      setLaunchState((currentState) =>
        currentState === "checking" ? "browser-installed-or-unavailable" : currentState,
      );
    }, 600);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (hasStoredGuardSession()) {
      router.replace("/guard/main");
    }
  }, [router]);

  async function handleGuardAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const session = await postJson<GuardSession>("/api/guard/auth", {
        name: form.get("name"),
        phone: form.get("phone"),
      });

      setSavedGuardName(session.employee.name);
      writeStoredGuardName(session.employee.name);
      writeStoredGuardSession(session);
      router.push("/guard/main");
    } catch (authError) {
      const authMessage = authError instanceof Error ? authError.message : "경비원 인증에 실패했습니다.";
      setErrorMessage(authMessage);
    }
  }

  return (
    <main className="min-h-screen bg-canvas text-ink font-apple selection:bg-primary/20">
      <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col justify-center gap-6 px-5 py-10">
        {launchState === "in-app" && <InAppBrowserGuide />}

        {(launchState === "installable-browser" || launchState === "browser-installed-or-unavailable") && (
          <GuardBrowserGate
            installPrompt={installPrompt}
            onInstalled={() => {
              setInstallPrompt(null);
              setLaunchState("browser-installed-or-unavailable");
            }}
          />
        )}

        {launchState === "standalone" && (
          <>
            <form className="w-full space-y-6" onSubmit={handleGuardAuth}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="guard-name">
                    경비원 이름
                  </label>
                  <input
                    className="field"
                    defaultValue={savedGuardName}
                    id="guard-name"
                    key={savedGuardName}
                    name="name"
                    placeholder="이름을 입력하세요."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="guard-phone">
                    경비원 연락처
                  </label>
                  <input className="field" id="guard-phone" name="phone" placeholder="010-0000-0000" required />
                </div>
              </div>
              <button className="button-primary w-full" data-testid="guard-auth-submit" type="submit">
                로그인
              </button>
            </form>

            <section className="w-full rounded-[18px] border border-hairline/50 bg-canvas-parchment p-6">
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-primary">로그아웃 Push 처리 결과</p>
                <h2 className="text-[21px] font-semibold">
                  {logoutPushResult ? "마지막 로그아웃 처리 내역" : "처리 내역 없음"}
                </h2>
                <p className="text-[14px] leading-relaxed text-ink-muted-48">
                  {logoutPushResult
                    ? `${formatLogoutResultTime(logoutPushResult.completedAt)}에 수행된 Push 알림 정리 결과입니다.`
                    : "로그아웃을 수행하면 브라우저 Push 구독 해제와 Supabase 구독정보 삭제 결과가 여기에 표시됩니다."}
                </p>
              </div>

              {logoutPushResult && (
                <dl className="mt-5 grid gap-3 text-[14px]">
                  <div className="rounded-[12px] border border-hairline/40 bg-canvas px-4 py-3">
                    <dt className="font-semibold text-ink">브라우저 구독</dt>
                    <dd className="mt-1 text-ink-muted-48">{getBrowserSubscriptionText(logoutPushResult.browserSubscription)}</dd>
                  </div>
                  <div className="rounded-[12px] border border-hairline/40 bg-canvas px-4 py-3">
                    <dt className="font-semibold text-ink">서버 구독정보</dt>
                    <dd className="mt-1 text-ink-muted-48">{getServerSubscriptionText(logoutPushResult.serverSubscription)}</dd>
                  </div>
                  <div className="rounded-[12px] border border-hairline/40 bg-canvas px-4 py-3">
                    <dt className="font-semibold text-ink">로그인 세션</dt>
                    <dd className="mt-1 text-ink-muted-48">{getSessionText(logoutPushResult.session)}</dd>
                  </div>
                  <div className="rounded-[12px] border border-hairline/40 bg-canvas px-4 py-3">
                    <dt className="font-semibold text-ink">endpoint</dt>
                    <dd className="mt-1 break-all text-ink-muted-48">{maskEndpoint(logoutPushResult.endpoint)}</dd>
                  </div>
                </dl>
              )}
            </section>
          </>
        )}
      </div>

      <AlertModal
        isOpen={Boolean(errorMessage)}
        onClose={() => setErrorMessage("")}
        title="인증 오류"
        description={errorMessage}
      />
    </main>
  );
}
