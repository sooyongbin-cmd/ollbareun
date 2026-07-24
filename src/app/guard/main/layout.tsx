import Link from "next/link";
import GuardSessionGate from "./guard-session-gate";
import GuardSessionSummary from "./guard-session-summary";
import GuardHeaderTitle from "./guard-header-title";
import { GuardIcon } from "@/components/icons/guard-icon";
import GuardBottomNavigation from "./guard-bottom-navigation";

export default function GuardMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-background pb-20 font-sans text-foreground selection:bg-primary/20">
      <GuardSessionGate />

      <nav className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-[980px] w-full h-full flex items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="shrink-0 text-[21px] font-semibold">
              <Link href="/guard/main" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <GuardIcon size={24} className="text-primary" />
                <GuardHeaderTitle />
              </Link>
            </h2>
            <GuardSessionSummary />
          </div>
        </div>
      </nav>

      {children}

      <GuardBottomNavigation />
    </main>
  );
}
