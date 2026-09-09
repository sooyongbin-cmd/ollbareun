"use client";

import { Button } from "@/components/ui/button";
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
      <div className="mx-auto flex w-full max-w-[37.5rem] items-center gap-4 rounded-xl border border-border bg-background p-4 shadow-lg">
        {/* A fixed-size PWA icon does not need Next.js image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="h-12 w-12 shrink-0 rounded-[0.875rem]" src="/icons/header-logo-color-192.png" alt="" width={48} height={48} />
        <div className="min-w-0 flex-1">
          <h2 id="guard-install-title" className="text-[1.0625rem] font-semibold text-foreground">
            올바름 현장 근로자 설치
          </h2>
          <p className="mt-1 text-[0.8125rem] leading-5 text-muted-foreground">휴대폰 홈 화면에 아이콘을 추가합니다.</p>
        </div>
        <Button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 shrink-0 px-5 py-2 text-[0.9375rem]" type="button" onClick={handleInstall}>
          설치
        </Button>
      </div>
    </div>
  );
}
