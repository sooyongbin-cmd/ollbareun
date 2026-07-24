"use client";

import { useEffect, useState } from "react";
import { isStandaloneGuardApp } from "./in-app-browser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
      <Card className="mx-auto flex w-full max-w-[600px] items-center gap-4 p-4 shadow-lg border">
        <CardContent className="p-0 flex items-center gap-4 w-full justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="h-12 w-12 shrink-0 rounded-xl" src="/guard-icon-192.png" alt="" width={48} height={48} />
          <div className="min-w-0 flex-1">
            <h2 id="guard-install-title" className="text-base font-semibold text-foreground">
              올바름 경비원 설치
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">휴대폰 홈 화면에 아이콘을 추가합니다.</p>
          </div>
          <Button size="sm" className="shrink-0 font-medium px-4" onClick={handleInstall}>
            설치
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
