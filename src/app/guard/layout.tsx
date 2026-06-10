import GuardInstallPrompt from "./guard-install-prompt";
import InAppBrowserChecker from "./in-app-browser-checker";

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
