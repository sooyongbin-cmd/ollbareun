"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ManagerKakaoLogin() {
  const [errorMessage, setErrorMessage] = useState("");

  async function signInWithKakao() {
    setErrorMessage("");

    const nextPath = new URLSearchParams(window.location.search).get("next") ?? "/manager";
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", nextPath);

    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      setErrorMessage("카카오 인증을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <main className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-5 py-16">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-[14px] font-semibold text-primary">관리자 인증</p>
            <h1 className="text-[30px] font-semibold leading-tight">관리자 카카오 인증화면</h1>
            <p className="text-[15px] leading-7 text-ink/70">
              관리자 화면은 카카오 인증을 완료한 계정만 접근할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={signInWithKakao}
            className="flex h-12 w-full items-center justify-center rounded-[8px] bg-[#FEE500] px-4 text-[15px] font-semibold text-[#191919] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            카카오로 관리자 인증
          </button>

          {errorMessage ? <p className="text-[14px] text-red-600">{errorMessage}</p> : null}
        </div>
      </main>
    </div>
  );
}
