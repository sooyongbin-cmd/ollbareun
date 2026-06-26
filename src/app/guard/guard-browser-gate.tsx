"use client";

import { AlertTriangle, Home } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

type GuardBrowserGateProps = {
  installPrompt: BeforeInstallPromptEvent | null;
  onInstalled: () => void;
};

export default function GuardBrowserGate({ installPrompt, onInstalled }: GuardBrowserGateProps) {
  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      onInstalled();
    }
  }

  if (installPrompt) {
    return (
      <section className="w-full rounded-[18px] border border-primary/20 bg-canvas-parchment p-6 shadow-product">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-primary text-white">
            <Home className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold text-ink leading-6">홈화면 아이콘 설치</h2>
            <p className="mt-2 text-[14px] font-semibold leading-relaxed text-ink-muted-48">
              경비원 로그인은 홈화면에 설치된 올바름 경비원 아이콘에서만 사용할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-hairline/40 pt-4">
          <button className="button-primary w-full" type="button" onClick={handleInstall}>
            홈화면 아이콘 설치
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full rounded-[18px] border border-amber-500/20 bg-[#fffbeb] p-6 shadow-product">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-amber-500 text-white">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold text-amber-900 leading-6">홈화면 아이콘에서 실행해 주세요</h2>
          <p className="mt-2 text-[14px] font-semibold leading-relaxed text-amber-800">
            이미 설치되어 있다면 휴대폰 홈화면의 올바름 경비원 아이콘을 눌러 로그인해 주세요.
          </p>
        </div>
      </div>
    </section>
  );
}
