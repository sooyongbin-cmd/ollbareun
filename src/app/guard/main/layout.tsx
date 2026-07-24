import Link from "next/link";
import GuardSessionGate from "./guard-session-gate";
import GuardSessionSummary from "./guard-session-summary";
import GuardHeaderTitle from "./guard-header-title";
import { GuardIcon } from "@/components/icons/guard-icon";
import { Separator } from "@/components/ui/separator";

export default function GuardMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 overflow-x-hidden">
      <GuardSessionGate />

      {/* Sticky top app bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-[600px] items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/guard/main"
              className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity shrink-0"
            >
              <GuardIcon size={24} className="text-primary" />
              <GuardHeaderTitle />
            </Link>
            <GuardSessionSummary />
          </div>
        </div>
      </header>

      {/* Main body content container */}
      <main className="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {children}
      </main>

      {/* Compact footer with Separator */}
      <footer className="w-full max-w-[600px] mx-auto px-4 sm:px-6 py-8 text-xs text-muted-foreground space-y-4">
        <Separator />
        <div className="flex flex-col sm:flex-row justify-between gap-3 leading-relaxed">
          <div>
            <p className="font-semibold text-foreground">올바름 관리시스템</p>
            <p className="mt-0.5">기업용 실시간 근태관리 및 안전교육 솔루션</p>
          </div>
          <div className="text-left sm:text-right">
            <p>© 2026 올바름. All rights reserved.</p>
            <p className="mt-0.5">개인정보처리방침 · 서비스이용약관</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
