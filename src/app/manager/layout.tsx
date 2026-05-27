import Link from "next/link";
import { Suspense } from "react";
import ManagerLoadingMessage from "./manager-loading-message";

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
  // ***** 권한관리(permission)는 초기 로그인만으로 처리하는 것으로 변경됨.
  // {
  //   label: "권한 관리",
  //   children: ["마스터 관리자", "중간 관리자", "등급별 접근 제한"],
  // },
  {
    label: "리포트 출력",
    children: ["주차 / 야간 / 직원이름 검색", "출퇴근 기록", "교육이수 자료", "자동 양식 생성"],
  },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink font-apple selection:bg-primary/20">
      <nav className="h-[44px] bg-surface-black text-canvas flex items-center px-5 sticky top-0 z-50">
        <div className="mx-auto max-w-[1180px] w-full flex items-center justify-between">
          <Link href="/" className="text-[12px] font-normal hover:opacity-80 transition-opacity">
            올바른 관리시스템
          </Link>
          <div className="flex gap-5">
            <span className="text-[12px] font-normal opacity-60">Phase 1</span>
          </div>
        </div>
      </nav>

      <nav className="h-[52px] bg-canvas-parchment/80 backdrop-blur-md sticky top-[44px] z-40 border-b border-hairline/30">
        <div className="mx-auto max-w-[1180px] w-full h-full flex items-center justify-between px-5">
          <h2 className="text-[21px] font-semibold">관리자</h2>
        </div>
      </nav>

      <div className="mx-auto max-w-[1180px] w-full px-5 py-[80px]">
        <div className="grid min-w-0 gap-[48px] lg:grid-cols-[240px_1fr]">
          <aside className="min-w-0 lg:sticky lg:top-[120px] self-start">
            <nav className="space-y-[12px]" aria-label="관리자화면 메뉴">
              <ul className="space-y-1">
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

          <section className="min-w-0">
            <Suspense fallback={<ManagerLoadingMessage />}>{children}</Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}
