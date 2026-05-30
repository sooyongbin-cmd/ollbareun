import GuardInstallPrompt from "./guard-install-prompt";
import InAppBrowserChecker from "./in-app-browser-checker";

export default function GuardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <GuardInstallPrompt />
      <InAppBrowserChecker />
    </>
  );
}
