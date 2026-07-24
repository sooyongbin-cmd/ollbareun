"use client";

import Link from "next/link";
import { ClipboardList, Clock3, Home, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/guard/main", label: "홈", icon: Home, exact: true },
  { href: "/guard/main/attendance", label: "출퇴근", icon: Clock3 },
  { href: "/guard/main/work", label: "업무", icon: ClipboardList },
  { href: "/guard/main/profile", label: "내 정보", icon: UserRound },
];

export default function GuardBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="현장 근로자 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto grid h-16 max-w-xl grid-cols-4">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
                active && "text-primary",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
