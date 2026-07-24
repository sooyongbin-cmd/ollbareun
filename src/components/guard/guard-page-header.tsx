"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GuardPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  showHomeButton?: boolean;
}

export function GuardPageHeader({
  title,
  description,
  backHref = "/guard/main",
  showHomeButton = true,
}: GuardPageHeaderProps) {
  return (
    <header className="mb-4 flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {backHref && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="뒤로가기"
                  >
                    <Link href={backHref}>
                      <ArrowLeft className="size-5" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>이전 화면으로 이동</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        </div>

        {showHomeButton && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label="홈으로 이동"
                >
                  <Link href="/guard/main">
                    <Home className="size-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>홈 메인으로 이동</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground pl-1">{description}</p>
      )}
    </header>
  );
}
