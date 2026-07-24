"use client";

import { Home } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import { GuardStatusAlert } from "@/components/guard/guard-status-alert";

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
      <Card className="w-full shadow-sm border">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Home className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">홈화면 아이콘 설치</CardTitle>
            <CardDescription className="mt-1 text-sm font-medium">
              경비원 로그인은 홈화면에 설치된 올바름 경비원 아이콘에서만 사용할 수 있습니다.
            </CardDescription>
          </div>
        </CardHeader>
        <CardFooter className="pt-2">
          <GuardActionButton onClick={handleInstall}>
            홈화면 아이콘 설치
          </GuardActionButton>
        </CardFooter>
      </Card>
    );
  }

  return (
    <GuardStatusAlert
      status="warning"
      title="홈화면 아이콘에서 실행해 주세요"
      description="이미 설치되어 있다면 휴대폰 홈화면의 올바름 경비원 아이콘을 눌러 로그인해 주세요."
    />
  );
}
