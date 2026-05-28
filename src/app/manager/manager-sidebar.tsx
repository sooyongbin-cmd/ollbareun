"use client";

import { useState } from "react";
import Link from "next/link";

const menu = [
  {
    label: "대시보드",
    children: ["요약 카드", "출퇴근 추이 차트", "안전교육 이수율 추이 차트", "실시간 출퇴근 현황"],
  },
  {
    label: "직원 관리",
    children: [
      { label: "직원명부관리", href: "/manager/employee/employees" },
      { label: "근무지관리", href: "/manager/employee/worksites" },
      { label: "근무지배정", href: "/manager/employee/assignments" },
    ],
  },
  {
    label: "안전교육",
    children: [
      { label: "교육자료관리", href: "/manager/safty/resources" },
      { label: "교육이수관리", href: "/manager/safty/completions" },
    ],
  },
  {
    label: "리포트 출력",
    children: ["주차 / 야간 / 직원이름 검색", "출퇴근 기록", "교육이수 자료", "자동 양식 생성"],
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
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`text-[15px] font-semibold py-2 transition-colors ${
                    activeLabel === item.label ? "text-primary border-b-2 border-primary" : "text-ink-muted-48"
                  }`}
                >
                  {item.label}
                </button>
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
              <div className="text-[14px] font-semibold text-ink mb-2">{item.label}</div>
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
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
