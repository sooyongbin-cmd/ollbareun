import Link from "next/link";
import GuardSessionGate from "./guard-session-gate";
import GuardSessionSummary from "./guard-session-summary";
import GuardCompanyLogo from "./guard-company-logo";
import GuardBottomNavigation from "./guard-bottom-navigation";
import GuardPushRegister from "./guard-push-register";

export default function GuardMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="guard-app-shell">
      <GuardSessionGate />

      <header className="guard-header">
        <Link aria-label="주식회사 올바름 홈" className="guard-header-logo" href="/guard/main">
          <GuardCompanyLogo />
        </Link>
        <div className="flex items-center justify-center">
            <GuardSessionSummary />
        </div>
      </header>

      <div className="guard-content">
        {children}
        <GuardPushRegister />
      </div>

      <GuardBottomNavigation />
    </div>
  );
}
