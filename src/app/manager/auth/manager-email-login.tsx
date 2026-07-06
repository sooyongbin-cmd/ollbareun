"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ManagerEmailLogin() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSending(true);

    const nextPath = new URLSearchParams(window.location.search).get("next") ?? "/manager";
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
      setErrorMessage("인증 메일을 보내지 못했습니다. 등록된 관리자 이메일인지 확인해 주세요.");
    } else {
      setSuccessMessage("인증 메일을 보냈습니다. 메일의 링크를 눌러 관리자 화면으로 돌아오세요.");
    }

    setIsSending(false);
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-5 py-16">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-[14px] font-semibold text-primary">관리자 인증</p>
            <h1 className="text-[30px] font-semibold leading-tight">관리자 이메일 인증화면</h1>
            <p className="text-[15px] leading-7 text-ink/70">
              등록된 관리자 이메일로 받은 인증 링크를 통해 관리자 화면에 접근할 수 있습니다.
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

            <button
              type="submit"
              disabled={isSending}
              className="button-primary h-12 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "발송 중..." : "인증 메일 받기"}
            </button>
          </form>

          {successMessage ? <p className="text-[14px] leading-6 text-primary">{successMessage}</p> : null}
          {errorMessage ? <p className="text-[14px] text-red-600">{errorMessage}</p> : null}
        </div>
      </main>
    </div>
  );
}
