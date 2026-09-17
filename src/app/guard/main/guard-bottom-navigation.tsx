"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/guard/main", label: "홈", icon: "/guard-assets/home.svg", exact: true },
  { href: "/guard/main/attendance", label: "출퇴근", icon: "/guard-assets/clock.svg" },
  { href: "/guard/main/safety", label: "안전교육", icon: "/guard-assets/safety.svg" },
  { href: "/guard/main/work", label: "점검", icon: "/guard-assets/inspection.svg" },
  { href: "/guard/main/special-remarks", label: "특이사항", icon: "/guard-assets/remarks.svg" },
  { href: "/guard/main/profile", label: "내 정보", icon: "/guard-assets/profile.svg" },
];

export default function GuardBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="현장 근로자 메뉴"
      className="guard-footer fixed inset-x-0 bottom-0 z-40"
    >
      <div className="guard-footer-items">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "guard-footer-item",
                active && "is-active",
              )}
              href={item.href}
              key={item.href}
            >
              <span className="guard-footer-icon-frame" aria-hidden="true">
                <img alt="" className="guard-footer-icon" height={item.label === "내 정보" ? 13 : 16} src={item.icon} width={item.label === "내 정보" ? 13 : 16} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
