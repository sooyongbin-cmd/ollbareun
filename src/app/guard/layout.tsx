import type { Metadata } from "next";
import GuardInstallPrompt from "./guard-install-prompt";
import InAppBrowserChecker from "./in-app-browser-checker";

export const metadata: Metadata = {
  title: "사회적기업 올바른",
};

export default function GuardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="guard-font-scale">
      {children}
      <GuardInstallPrompt />
      <InAppBrowserChecker />
    </div>
  );
}
