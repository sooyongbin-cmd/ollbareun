"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { markManagerBrowserSessionActive } from "../manager-browser-session-storage";
import ManagerInAppBrowserChecker from "../manager-in-app-browser-checker";
import ManagerInstallPrompt from "../manager-install-prompt";

type ManagerEmailLoginProps = {
  initialAdminSetupRequired?: boolean;
  errorParam?: string;
  emailParam?: string;
};

function getNextPath() {
  return new URLSearchParams(window.location.search).get("next") ?? "/manager";
}

function createCallbackUrl(setup?: "initial_admin") {
  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("next", getNextPath());

  if (setup) {
    redirectTo.searchParams.set("setup", setup);
  }

  return redirectTo.toString();
}

export default function ManagerEmailLogin({
  initialAdminSetupRequired = false,
  errorParam,
  emailParam,
}: ManagerEmailLoginProps) {
  const [setupCode, setSetupCode] = useState("");
  const [errorMessage, setErrorMessage] = useState(() => {
    if (emailParam) {
      return `사용자(${emailParam})가 관리자로 등록되지 않았습니다.`;
    }
    if (errorParam === "unauthorized") {
      return "등록되지 않은 관리자 계정입니다. 관리자 등록을 먼저 완료해주세요.";
    }
    if (errorParam === "callback") {
      return "인증 중 오류가 발생했습니다. 다시 시도해주세요.";
    }
    return "";
  });
  const [isSending, setIsSending] = useState(false);

  async function signInWithGoogle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSending(true);
    markManagerBrowserSessionActive();

    try {
      if (initialAdminSetupRequired) {
        const response = await fetch("/api/manager/initial-admin/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            setupCode: setupCode.trim(),
            nextPath: getNextPath(),
          }),
        });
        const result = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !result.url) {
          throw new Error(result.error || "Google 인증을 시작하지 못했습니다.");
        }

        window.location.assign(result.url);
        return;
      }

      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: createCallbackUrl(),
        },
      });

      if (error) {
        throw new Error("Google 인증을 시작하지 못했습니다. 등록된 관리자 계정인지 확인해주세요.");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google 인증 요청을 처리하지 못했습니다.");
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-[14px] font-semibold text-primary">관리자 인증</p>
            <h1 className="text-[30px] font-semibold leading-tight">
              {initialAdminSetupRequired ? "최초 관리자 등록" : "관리자 Google 인증"}
            </h1>
            <p className="text-[15px] leading-7 text-ink/70">
              {initialAdminSetupRequired
                ? "등록된 관리자가 없어 최초 관리자 등록코드 확인 후 Google 인증을 시작합니다."
                : "등록된 관리자 Google 계정으로 인증 후 관리자 화면에 접근할 수 있습니다."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={signInWithGoogle}>
            {initialAdminSetupRequired ? (
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48" htmlFor="initial-admin-setup-code">
                  최초 관리자 등록코드
                </label>
                <input
                  id="initial-admin-setup-code"
                  type="password"
                  value={setupCode}
                  onChange={(event) => setSetupCode(event.target.value)}
                  required
                  autoComplete="one-time-code"
                  className="field"
                />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSending}
              className="button-primary h-12 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending
                ? "이동 중..."
                : initialAdminSetupRequired
                  ? "Google로 최초 관리자 등록"
                  : "Google로 관리자 로그인"}
            </button>
          </form>

          {errorMessage ? <p className="text-[14px] text-red-600">{errorMessage}</p> : null}
        </div>
      </main>
      <ManagerInAppBrowserChecker />
      <ManagerInstallPrompt />
    </div>
  );
}
