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
      { label: "직원등록", href: "/manager/employee/employees/new" },
      { label: "근무지등록", href: "/manager/employee/worksites/new" },
      { label: "근무지배정", href: "/manager/employee/assignments/new" },
    ],
  },
  {
    label: "안전교육 관리",
    children: ["교육 대상 관리 목록/등록/수정", "교육 이수 관리"],
  },
  {
    label: "권한 관리",
    children: ["마스터 관리자", "중간 관리자", "등급별 접근 제한"],
  },
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
      <nav className="h-[44px] bg-surface-black text-white flex items-center px-5 sticky top-0 z-50">
        <div className="mx-auto max-w-[980px] w-full flex items-center justify-between">
          <Link href="/" className="text-[12px] font-normal tracking-[-0.12px] hover:opacity-80 transition-opacity">
            올바른 관리시스템
          </Link>
          <div className="flex gap-5">
            <span className="text-[12px] font-normal tracking-[-0.12px] opacity-60">Phase 1</span>
          </div>
        </div>
      </nav>

      <nav className="h-[52px] bg-canvas-parchment/80 backdrop-blur-md sticky top-[44px] z-40 border-b border-hairline/30">
        <div className="mx-auto max-w-[980px] w-full h-full flex items-center justify-between px-5">
          <h2 className="text-[21px] font-semibold tracking-[0.231px]">관리자</h2>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[14px] text-primary hover:underline">
              나가기
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
        <div className="grid gap-[48px] lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-[120px] self-start">
            <nav className="space-y-[12px]" aria-label="관리자화면 메뉴">
              <p className="text-[14px] font-semibold text-ink-muted-48 px-2 uppercase tracking-wider">관리자화면</p>
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

          <section>{children}</section>
        </div>
      </div>
    </div>
  );
}
