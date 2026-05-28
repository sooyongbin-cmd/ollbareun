import Link from "next/link";
import GuardWorksiteSection from "./guard-worksite-section";
import GuardAttendanceSection from "./guard-attendance-section";
import GuardSafetySection from "./guard-safety-section";

export default function GuardMainPage() {
  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <div className="max-w-[600px] mx-auto">
        <GuardWorksiteSection />
        <GuardAttendanceSection />
        <GuardSafetySection />
        
        <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
          <div className="flex flex-col gap-3">
            <button className="button-secondary w-full" type="button">
              근무지확인
            </button>
            <button className="button-secondary w-full" type="button">
              개인프로필
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
