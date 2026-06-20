"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const menu = [
  {
    label: "대시보드",
    href: "/manager",
    children: [],
  },
  {
    label: "직원관리",
    children: [
      { label: "직원명부관리", href: "/manager/employee/employees" },
      { label: "근무지관리", href: "/manager/employee/worksites" },
      { label: "근무지배정", href: "/manager/employee/assignments" },
    ],
  },
  {
    label: "현장점검",
    children: [
      { label: "현장관리", href: "/manager/inspection/sites" },
      { label: "현장점검현황", href: "/manager/inspection/logs" },
      { label: "특이사항", href: "/manager/inspection/special-remarks" },
    ],
  },
  {
    label: "안전교육",
    children: [
      { label: "교육자료관리", href: "/manager/safty/resources" },
      { label: "교육이수관리", href: "/manager/safty/completions" },
      { label: "자동알림", href: "/manager/safty/notifications" },
      // { label: "교육자료(cloudflare)", href: "/manager/safty/cloudflare" },
    ],
  },
  {
    label: "리포트출력",
    children: [
      { label: "근태내역", href: "/manager/reports/attendance" },
      { label: "교육이수자료", href: "/manager/reports/education" },
    ],
  },
  {
    label: "시스템",
    children: [
      { label: "로그현황", href: "/manager/system/logs" },
      { label: "패스키 요청 관리", href: "/manager/system/passkeys" },
      { label: "시스템설정", href: "/manager/system/configs" },
    ],
  },
];

export default function ManagerSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="contents">
      <button
        type="button"
        aria-label="관리자 메뉴 열기"
        aria-controls="manager-mobile-menu"
        aria-expanded={isMobileMenuOpen}
        onClick={() => setIsMobileMenuOpen(true)}
        className="fixed right-5 top-2 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
      >
        <Menu aria-hidden="true" size={22} />
      </button>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="관리자 메뉴 배경 닫기"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-surface-black/35 backdrop-blur-[1px]"
          />

          <nav
            id="manager-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="관리자 메뉴"
            className="absolute inset-y-0 right-0 w-[min(88vw,360px)] overflow-y-auto bg-canvas px-6 pb-10 pt-5 shadow-2xl"
          >
            <div className="mb-7 flex items-center justify-between border-b border-hairline/30 pb-4">
              <h3 className="text-[19px] font-semibold">관리자 메뉴</h3>
              <button
                type="button"
                aria-label="관리자 메뉴 닫기"
                onClick={closeMobileMenu}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>

            <ul className="space-y-6">
              {menu.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={closeMobileMenu}
                      className="block text-[16px] font-semibold text-primary transition-opacity hover:opacity-80"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <>
                      <div className="mb-3 text-[16px] font-semibold text-ink">{item.label}</div>
                      <div className="space-y-3 border-l border-hairline/40 pl-4">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={closeMobileMenu}
                            className="block text-[14px] font-medium leading-relaxed text-primary transition-opacity hover:opacity-80"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}

      <aside className="hidden min-w-0 self-start lg:sticky lg:top-[120px] lg:block">
        <nav aria-label="관리자화면 메뉴">
          <ul className="hidden space-y-1 lg:block">
            {menu.map((item) => (
              <li key={item.label} className="px-2 py-2">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mb-2 block text-[14px] font-semibold text-primary transition-opacity hover:opacity-80"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <div className="mb-2 text-[14px] font-semibold text-ink">{item.label}</div>
                )}
                {item.children.length > 0 ? (
                  <div className="space-y-2 pl-2">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block text-[14px] font-medium leading-relaxed text-primary transition-colors hover:opacity-80"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
