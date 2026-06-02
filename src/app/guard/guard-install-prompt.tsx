"use client";

import { useEffect, useState } from "react";
import { isStandaloneGuardApp } from "./in-app-browser";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

export default function GuardInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(isStandaloneGuardApp);

  useEffect(() => {
    if (window.location.pathname === "/guard") {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setHidden(false);
    }

    function handleAppInstalled() {
      setHidden(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!installPrompt || hidden) {
    return null;
  }

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setHidden(true);
    }
    setInstallPrompt(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:pb-6" role="dialog" aria-labelledby="guard-install-title">
      <div className="mx-auto flex w-full max-w-[600px] items-center gap-4 rounded-[18px] border border-hairline bg-canvas p-4 shadow-product">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-primary text-[20px] font-semibold text-canvas">
          올
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="guard-install-title" className="text-[17px] font-semibold text-ink">
            올바른 경비원 설치
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted-48">휴대폰 홈 화면에 아이콘을 추가합니다.</p>
        </div>
        <button className="button-primary shrink-0 px-5 py-2 text-[15px]" type="button" onClick={handleInstall}>
          설치
        </button>
      </div>
    </div>
  );
}
