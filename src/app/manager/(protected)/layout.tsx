import { Suspense } from "react";
import ManagerBrowserSessionGate from "./manager-browser-session-gate";
import ManagerLoadingMessage from "./manager-loading-message";
import ManagerSidebar from "./manager-sidebar";
import ManagerHeader from "./manager-header";
import ManagerInAppBrowserChecker from "../manager-in-app-browser-checker";
import ManagerInstallPrompt from "../manager-install-prompt";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="manager-shell min-h-svh bg-background text-foreground selection:bg-primary/20">
      <ManagerBrowserSessionGate />
      <SidebarProvider
        className="manager-shell"
        style={
          {
            "--sidebar-width": "17rem",
            "--sidebar-width-icon": "3.5rem",
          } as React.CSSProperties
        }
      >
        <ManagerSidebar />
        <SidebarInset className="min-w-0">
          <ManagerHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col">
              <section className="mx-auto w-full max-w-[1600px] min-w-0 p-4 md:p-6 lg:p-8">
                <Suspense fallback={<ManagerLoadingMessage />}>{children}</Suspense>
              </section>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <ManagerInAppBrowserChecker />
      <ManagerInstallPrompt />
    </div>
  );
}
