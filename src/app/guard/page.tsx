"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GpsInfo } from "@/lib/gps";
import { getSupabasePasskeyClient } from "@/lib/supabase-passkey-client";
import { isCurrentInAppBrowser, isStandaloneGuardApp } from "./in-app-browser";
import InAppBrowserGuide from "./in-app-browser-guide";
import GuardBrowserGate from "./guard-browser-gate";
import {
  hasActiveStoredGuardSession,
  writeStoredGuardSession,
} from "./guard-session-storage";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import { GuardNoticeDialog } from "@/components/guard/guard-notice-dialog";
import { KeyRound } from "lucide-react";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  is_retired: boolean;
  role: "경비원" | "미화원" | "파견";
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

function hasStoredGuardSession() {
  return hasActiveStoredGuardSession({ touch: true });
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
  const [guardLoginProgress, setGuardLoginProgress] = useState("");
  const [isGuardLoginPending, setIsGuardLoginPending] = useState(false);

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
    if (isGuardLoginPending) {
      return;
    }

    const form = new FormData(event.currentTarget);

    try {
      setErrorMessage("");
      setIsGuardLoginPending(true);
      setGuardLoginProgress("로그인 요청을 전송하고 있습니다.");
      const session = await postJson<GuardSession>("/api/guard/auth", {
        name: form.get("name"),
        phone: form.get("phone"),
      });

      setGuardLoginProgress("근무자 정보를 확인했습니다.");
      setSavedGuardName(session.employee.name);
      setGuardLoginProgress("로그인 정보를 저장하고 있습니다.");
      writeStoredGuardName(session.employee.name);
      writeStoredGuardSession(session);
      setGuardLoginProgress("메인 화면으로 이동합니다.");
      router.push("/guard/main");
    } catch (authError) {
      const authMessage = authError instanceof Error ? authError.message : "근무자 인증에 실패했습니다.";
      setGuardLoginProgress("로그인에 실패했습니다. 내용을 확인해 주세요.");
      setErrorMessage(authMessage);
      setIsGuardLoginPending(false);
    }
  }

  async function handlePasskeyLogin() {
    if (isGuardLoginPending) {
      return;
    }
    try {
      setErrorMessage("");
      setIsGuardLoginPending(true);
      setGuardLoginProgress("패스키 로그인 요청을 전송하고 있습니다.");

      const supabase = getSupabasePasskeyClient();
      const { data, error } = await supabase.auth.signInWithPasskey();

      if (error) {
        throw error;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("패스키 로그인 세션을 확인하지 못했습니다.");
      }

      const response = await fetch("/api/guard/passkeys/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const session = await response.json();

      if (!response.ok) {
        throw new Error(session.error ?? "패스키 로그인에 실패했습니다.");
      }

      writeStoredGuardSession(session);
      router.push("/guard/main");
    } catch (passkeyError) {
      const message = passkeyError instanceof Error ? passkeyError.message : "패스키 로그인에 실패했습니다.";
      setErrorMessage(message);
      setIsGuardLoginPending(false);
      setGuardLoginProgress("");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[600px] space-y-6">
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
            {/* Name / Phone Authentication Card */}
            <Card className="w-full shadow-sm border" role="region" aria-label="근무자 로그인">
              <CardHeader className="text-center space-y-1 pb-4">
                <p className="text-sm font-semibold text-primary">사회적기업 올바름</p>
                <CardTitle className="text-2xl font-bold">근무자 로그인</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="w-full space-y-5" onSubmit={handleGuardAuth}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="guard-name">이름</Label>
                      <Input
                        id="guard-name"
                        key={savedGuardName}
                        name="name"
                        defaultValue={savedGuardName}
                        placeholder="이름을 입력하세요."
                        required
                        aria-invalid={Boolean(errorMessage)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guard-phone">연락처</Label>
                      <Input
                        id="guard-phone"
                        name="phone"
                        placeholder="010-0000-0000"
                        required
                        aria-invalid={Boolean(errorMessage)}
                      />
                    </div>
                  </div>

                  <GuardActionButton
                    type="submit"
                    data-testid="guard-auth-submit"
                    isLoading={isGuardLoginPending}
                    loadingText={guardLoginProgress || "로그인 중..."}
                  >
                    로그인
                  </GuardActionButton>

                  {guardLoginProgress && (
                    <p aria-live="polite" className="text-center text-xs text-muted-foreground">
                      {guardLoginProgress}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Passkey Authentication Card */}
            <Card className="w-full shadow-sm border" role="region" aria-label="패스키 로그인">
              <CardContent className="pt-6 space-y-3">
                <GuardActionButton
                  variant="outline"
                  onClick={handlePasskeyLogin}
                  isLoading={isGuardLoginPending}
                  icon={<KeyRound className="size-4" />}
                >
                  패스키로 로그인
                </GuardActionButton>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  관리자 승인을 받은 뒤 이 기기에 패스키를 등록한 근무자만 사용할 수 있습니다.
                </p>
              </CardContent>
            </Card>

            {/* Logout Push Result Log Card */}
            <Card className="w-full shadow-sm border" role="region" aria-label="로그아웃 Push 처리 결과">
              <CardHeader className="space-y-1">
                <p className="text-xs font-semibold text-primary">로그아웃 Push 처리 결과</p>
                <CardTitle className="text-lg font-semibold">
                  {logoutPushResult ? "마지막 로그아웃 처리 내역" : "처리 내역 없음"}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {logoutPushResult
                    ? `${formatLogoutResultTime(logoutPushResult.completedAt)}에 수행된 Push 알림 정리 결과입니다.`
                    : "로그아웃을 수행하면 브라우저 Push 구독 해제와 Supabase 구독정보 삭제 결과가 여기에 표시됩니다."}
                </CardDescription>
              </CardHeader>

              {logoutPushResult && (
                <CardContent>
                  <dl className="grid gap-2 text-xs">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <dt className="font-semibold text-foreground">브라우저 구독</dt>
                      <dd className="mt-1 text-muted-foreground">{getBrowserSubscriptionText(logoutPushResult.browserSubscription)}</dd>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <dt className="font-semibold text-foreground">서버 구독정보</dt>
                      <dd className="mt-1 text-muted-foreground">{getServerSubscriptionText(logoutPushResult.serverSubscription)}</dd>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <dt className="font-semibold text-foreground">로그인 세션</dt>
                      <dd className="mt-1 text-muted-foreground">{getSessionText(logoutPushResult.session)}</dd>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <dt className="font-semibold text-foreground">endpoint</dt>
                      <dd className="mt-1 break-all text-muted-foreground">{maskEndpoint(logoutPushResult.endpoint)}</dd>
                    </div>
                  </dl>
                </CardContent>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Progress Dialog */}
      <GuardNoticeDialog
        open={isGuardLoginPending}
        dismissible={false}
        title="로그인 진행 중"
        description={`${guardLoginProgress || "로그인 요청을 처리하는 중입니다."}\n로그인진행중....`}
        confirmLabel="처리 중..."
      />

      {/* Auth Error Dialog */}
      <GuardNoticeDialog
        open={Boolean(errorMessage)}
        onOpenChange={(open) => {
          if (!open) setErrorMessage("");
        }}
        title="인증 오류"
        description={errorMessage}
        onConfirm={() => setErrorMessage("")}
      />
    </main>
  );
}
