import Link from "next/link";
import { Suspense } from "react";
import ManagerLoadingMessage from "./manager-loading-message";
import ManagerSidebar from "./manager-sidebar";

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
          <ManagerSidebar />

          <section className="min-w-0">
            <Suspense fallback={<ManagerLoadingMessage />}>{children}</Suspense>
          </section>
        </div>
      </div>
    </div>
  );
}
