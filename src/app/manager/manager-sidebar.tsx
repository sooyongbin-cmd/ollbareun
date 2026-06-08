"use client";

import { useState } from "react";
import Link from "next/link";

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
    ],
  },
  {
    label: "안전교육",
    children: [
      { label: "교육자료관리", href: "/manager/safty/resources" },
      { label: "교육이수관리", href: "/manager/safty/completions" },
      { label: "교육자료(cloudflare)", href: "/manager/safty/cloudflare" },
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
    ],
  },
];

export default function ManagerSidebar() {
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const toggleMenu = (label: string) => {
    setActiveLabel(activeLabel === label ? null : label);
  };

  return (
    <aside className="min-w-0 lg:sticky lg:top-[120px] self-start">
      <nav aria-label="관리자화면 메뉴">
        {/* Mobile: Horizontal Menu */}
        <div className="lg:hidden mb-8">
          <ul className="flex flex-row overflow-x-auto border-b border-hairline/30 pb-2 gap-6 scrollbar-hide">
            {menu.map((item) => (
              <li key={item.label} className="shrink-0">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="block text-[15px] font-semibold py-2 transition-colors text-ink-muted-48"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`text-[15px] font-semibold py-2 transition-colors ${
                      activeLabel === item.label ? "text-primary border-b-2 border-primary" : "text-ink-muted-48"
                    }`}
                  >
                    {item.label}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {/* Mobile Expanded Submenu */}
          {activeLabel && (
            <div className="mt-4 bg-canvas-parchment/50 rounded-[12px] p-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-3">
                {menu
                  .find((m) => m.label === activeLabel)
                  ?.children.map((child, idx) => {
                    const isLink = typeof child !== "string";
                    const label = isLink ? child.label : child;
                    const href = isLink ? child.href : "#";

                    return isLink ? (
                      <Link
                        key={idx}
                        href={href}
                        className="block text-[14px] leading-relaxed transition-colors text-primary font-medium hover:opacity-80"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span key={idx} className="block text-[14px] leading-relaxed text-ink-muted-48">
                        {label}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Desktop: Vertical Sidebar */}
        <ul className="hidden lg:block space-y-1">
          {menu.map((item) => (
            <li key={item.label} className="py-2 px-2">
              {item.href ? (
                <Link
                  href={item.href}
                  className="block text-[14px] font-semibold text-primary mb-2 hover:opacity-80 transition-opacity"
                >
                  {item.label}
                </Link>
              ) : (
                <div className="text-[14px] font-semibold text-ink mb-2">{item.label}</div>
              )}
              {item.children.length > 0 ? (
                <div className="space-y-2 pl-2">
                  {item.children.map((child, idx) => {
                  const isLink = typeof child !== "string";
                  const label = isLink ? child.label : child;
                  const href = isLink ? child.href : "#";

                  return isLink ? (
                    <Link
                      key={idx}
                      href={href}
                      className="block text-[14px] leading-relaxed transition-colors text-primary font-medium hover:opacity-80"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span key={idx} className="block text-[14px] leading-relaxed text-ink-muted-48">
                      {label}
                    </span>
                  );
                  })}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
