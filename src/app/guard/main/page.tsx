import Link from "next/link";
import GuardWorksiteSection from "./guard-worksite-section";
import GuardAttendanceSection from "./guard-attendance-section";
import GuardSafetySection from "./guard-safety-section";
import GuardPushRegister from "./guard-push-register";

export default function GuardMainPage() {
  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <GuardPushRegister />
      <div className="max-w-[600px] mx-auto">
        <GuardWorksiteSection />
        <GuardAttendanceSection />
        <GuardSafetySection />
        
        <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
          <div className="flex flex-col gap-3">
            <Link className="button-secondary w-full justify-center" href="/guard/main/inspection">
              현장점검
            </Link>
            <button className="button-secondary w-full" type="button">
              개인프로필
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
