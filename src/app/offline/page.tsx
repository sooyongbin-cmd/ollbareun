"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background font-sans text-center">
      <div className="max-w-[400px] w-full bg-muted/40 rounded-xl p-[32px] border border-border/50 shadow-sm">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-destructive-bg flex items-center justify-center text-destructive-text">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-[20px] font-semibold text-foreground mb-2">
          인터넷 연결이 끊어졌습니다
        </h1>
        <p className="text-[14px] text-muted-foreground mb-6 leading-relaxed">
          네트워크 연결 상태를 확인하고 아래의 {"'다시 시도'"} 버튼을 눌러주세요.
        </p>

        <Button
          onClick={handleRetry}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full flex items-center justify-center gap-2 py-3 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </Button>
      </div>
    </div>
  );
}
