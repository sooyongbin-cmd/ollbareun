"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type ManagerEmailLoginProps = {
  initialAdminSetupRequired?: boolean;
};

function getNextPath() {
  return new URLSearchParams(window.location.search).get("next") ?? "/manager";
}

export default function ManagerEmailLogin({ initialAdminSetupRequired = false }: ManagerEmailLoginProps) {
  const [email, setEmail] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSending(true);

    try {
      if (initialAdminSetupRequired) {
        const response = await fetch("/api/manager/initial-admin/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            setupCode: setupCode.trim(),
            nextPath: getNextPath(),
          }),
        });
        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error || "최초 관리자 인증 메일을 보내지 못했습니다.");
        }

        setSuccessMessage("인증 메일을 보냈습니다. 메일 인증 후 최초 관리자로 등록됩니다.");
        return;
      }

      const nextPath = getNextPath();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      redirectTo.searchParams.set("next", nextPath);

      const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo.toString(),
          shouldCreateUser: false,
        },
      });

      if (error) {
        throw new Error("인증 메일을 보내지 못했습니다. 등록된 관리자 이메일인지 확인해주세요.");
      }

      setSuccessMessage("인증 메일을 보냈습니다. 메일의 링크를 눌러 관리자 화면으로 돌아오세요.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "인증 요청을 처리하지 못했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-5 py-16">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-[14px] font-semibold text-primary">관리자 인증</p>
            <h1 className="text-[30px] font-semibold leading-tight">
              {initialAdminSetupRequired ? "최초 관리자 등록" : "관리자 이메일 인증"}
            </h1>
            <p className="text-[15px] leading-7 text-ink/70">
              {initialAdminSetupRequired
                ? "등록된 관리자가 없어 최초 관리자 등록코드로 이메일 인증을 시작합니다."
                : "등록된 관리자 이메일로 받은 인증 링크를 통해 관리자 화면에 접근할 수 있습니다."}
            </p>
          </div>

          <form className="space-y-4" onSubmit={signInWithEmail}>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48" htmlFor="manager-email">
                관리자 이메일
              </label>
              <input
                id="manager-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="field"
                placeholder="admin@example.com"
              />
            </div>

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
                ? "발송 중..."
                : initialAdminSetupRequired
                  ? "최초 관리자 인증 메일 받기"
                  : "인증 메일 받기"}
            </button>
          </form>

          {successMessage ? <p className="text-[14px] leading-6 text-primary">{successMessage}</p> : null}
          {errorMessage ? <p className="text-[14px] text-red-600">{errorMessage}</p> : null}
        </div>
      </main>
    </div>
  );
}
