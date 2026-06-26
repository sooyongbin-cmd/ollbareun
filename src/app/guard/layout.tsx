import type { Metadata } from "next";
import GuardInstallPrompt from "./guard-install-prompt";
import InAppBrowserChecker from "./in-app-browser-checker";
import GuardZoomScope from "./guard-zoom-scope";

export const metadata: Metadata = {
  title: "사회적기업 올바름",
};

export default function GuardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GuardZoomScope>
      {children}
      <GuardInstallPrompt />
      <InAppBrowserChecker />
    </GuardZoomScope>
  );
}
