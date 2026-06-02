import Link from "next/link";
import GuardSessionGate from "./guard-session-gate";
import GuardSessionSummary from "./guard-session-summary";
import GuardLogoutButton from "./guard-logout-button";
import { GuardIcon } from "@/components/icons/guard-icon";

export default function GuardMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-canvas text-ink font-apple selection:bg-primary/20">
      <GuardSessionGate />
      <nav className="h-[44px] bg-surface-black text-canvas flex items-center px-5 sticky top-0 z-50">
        <div className="mx-auto max-w-[980px] w-full flex items-center justify-between">
          <Link href="/" className="text-[12px] font-normal hover:opacity-80 transition-opacity">
            올바른 관리시스템
          </Link>
          <div className="flex gap-5">
            <span className="text-[12px] font-normal opacity-60">Phase 1</span>
          </div>
        </div>
      </nav>

      <nav className="h-[52px] bg-canvas-parchment/80 backdrop-blur-md sticky top-[44px] z-40 border-b border-hairline/30">
        <div className="mx-auto max-w-[980px] w-full h-full flex items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="shrink-0 text-[21px] font-semibold">
              <Link href="/guard/main" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <GuardIcon size={24} className="text-primary" />
                <span>경비원</span>
              </Link>
            </h2>
            <GuardSessionSummary />
          </div>
          <div className="flex items-center gap-6">
            <GuardLogoutButton />
          </div>
        </div>
      </nav>

      {children}

      <footer className="bg-canvas-parchment border-t border-hairline py-[64px] px-5">
        <div className="mx-auto max-w-[980px] w-full grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <h4 className="text-[14px] font-semibold text-ink-muted-80 mb-4">올바른 관리시스템</h4>
            <p className="text-[12px] text-ink-muted-48 leading-relaxed max-w-[400px]">
              본 시스템은 실시간 근태 관리 및 안전 교육 이수 현황을 관리하기 위한 기업용 솔루션입니다.
              사용 중 문의사항은 관리자에게 연락 바랍니다.
            </p>
          </div>
          <div>
            <h4 className="text-[14px] font-semibold text-ink-muted-80 mb-4">법적 고지</h4>
            <p className="text-[12px] text-ink-muted-48 leading-relaxed">
              © 2026 올바른. All rights reserved.
              개인정보처리방침 | 서비스이용약관
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
