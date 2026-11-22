"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";
import { useRef, useState } from "react";

const launchFromHomeMessage = "이미 설치되어 있다면 휴대폰 홈화면의 올바름 근무자 아이콘을 눌러 로그인해 주세요.";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

type GuardBrowserGateProps = {
  installPrompt: BeforeInstallPromptEvent | null;
  onInstalled: () => void;
};

export default function GuardBrowserGate({ installPrompt, onInstalled }: GuardBrowserGateProps) {
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const usedInstallPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  async function handleInstall() {
    if (!installPrompt || usedInstallPrompt.current === installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    usedInstallPrompt.current = installPrompt;
    setShowInstallHelp(false);

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        onInstalled();
        return;
      }
    } catch {
      // The browser can invalidate a saved installation prompt.
    }

    setShowInstallHelp(true);
  }

  const installButton = (
    <div className="mt-5 border-t border-border/40 pt-4">
      <Button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full" type="button" onClick={handleInstall}>
        홈화면 아이콘 설치
      </Button>
      <div role="status">
        {showInstallHelp && (
          <p className="mt-3 text-sm text-muted-foreground">
            브라우저 메뉴(⋮) 또는 공유 메뉴에서 ‘홈 화면에 추가’를 선택해 주세요.
            ‘바로가기 만들기’가 표시되면 선택해 주세요.
          </p>
        )}
      </div>
    </div>
  );

  if (installPrompt) {
    return (
      <section className="w-full rounded-xl border border-primary/20 bg-muted/40 p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-primary text-white">
            <Home className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.125rem] font-bold text-foreground leading-6">홈화면 아이콘 설치</h2>
            <p className="mt-2 text-[0.875rem] font-semibold leading-relaxed text-muted-foreground">
              현장 근무자 로그인은 홈화면에 설치된 올바름 근무자 아이콘에서만 사용할 수 있습니다.
            </p>
          </div>
        </div>

        {installButton}
      </section>
    );
  }

  return (
    <section className="w-full rounded-xl border border-border bg-muted p-6 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-primary text-white">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.125rem] font-bold text-foreground leading-6">홈화면 아이콘에서 실행해 주세요</h2>
          <p className="mt-2 text-[0.875rem] font-semibold leading-relaxed text-muted-foreground">
            {launchFromHomeMessage}
          </p>
        </div>
      </div>

      {installButton}
    </section>
  );
}
