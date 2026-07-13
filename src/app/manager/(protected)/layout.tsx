import { Suspense } from "react";
import ManagerBrowserSessionGate from "./manager-browser-session-gate";
import ManagerLoadingMessage from "./manager-loading-message";
import ManagerSidebar from "./manager-sidebar";
import ManagerHeader from "./manager-header";
import ManagerInAppBrowserChecker from "../manager-in-app-browser-checker";
import ManagerInstallPrompt from "../manager-install-prompt";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink font-apple selection:bg-primary/20">
      <ManagerBrowserSessionGate />
      <nav className="h-[52px] bg-canvas-parchment/80 backdrop-blur-md sticky top-0 z-40 border-b border-hairline/30">
        <div className="mx-auto flex h-full w-full max-w-[1180px] items-center justify-between px-6">
          <ManagerHeader />
        </div>
      </nav>

      <div className="mx-auto w-full max-w-[1180px] px-6 py-[80px]">
        <div className="grid min-w-0 gap-[48px] lg:grid-cols-[240px_1fr]">
          <ManagerSidebar />

          <section className="manager-content min-w-0">
            <Suspense fallback={<ManagerLoadingMessage />}>{children}</Suspense>
          </section>
        </div>
      </div>
      <ManagerInAppBrowserChecker />
      <ManagerInstallPrompt />
    </div>
  );
}
