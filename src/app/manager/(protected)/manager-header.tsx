"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { UserResponse } from "@supabase/supabase-js";
import { ChevronRight, LogOut, UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { findManagerNavigation } from "./manager-navigation";

export default function ManagerHeader() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const current = findManagerNavigation(pathname);

  useEffect(() => {
    let active = true;

    try {
      const supabase = createSupabaseBrowserClient();

      if (supabase.auth && typeof supabase.auth.getUser === "function") {
        supabase.auth
          .getUser()
          .then((response: UserResponse) => {
            const user = response.data?.user;
            if (active && user?.email) {
              setEmail(user.email);
            }
          })
          .catch(() => {});
      }
    } catch {
      // The protected server layout remains the source of truth for authentication.
    }

    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } finally {
      window.location.assign("/manager/auth");
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      <SidebarTrigger aria-label="관리자 메뉴 열기 또는 접기" className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />

      <nav aria-label="현재 위치" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden text-muted-foreground sm:inline">관리자</span>
        {current.group ? (
          <>
            <ChevronRight aria-hidden="true" className="hidden size-3.5 text-muted-foreground sm:block" />
            <span className="hidden text-muted-foreground sm:inline">{current.group.label}</span>
          </>
        ) : null}
        <ChevronRight aria-hidden="true" className="hidden size-3.5 text-muted-foreground sm:block" />
        <span className="truncate font-medium text-foreground">{current.item.label}</span>
      </nav>

      {email ? (
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound aria-hidden="true" className="size-3.5" />
          </span>
          <span className="hidden max-w-52 truncate md:inline">{email}</span>
        </div>
      ) : null}

      <Button
        type="button"
        aria-label="로그아웃"
        variant="ghost"
        size="sm"
        className="ml-auto gap-2"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        <LogOut aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">{isSigningOut ? "로그아웃 중" : "로그아웃"}</span>
        <span className="sr-only sm:hidden">로그아웃</span>
      </Button>
    </header>
  );
}
