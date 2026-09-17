import Link from "next/link";

import GuardWorksiteSection from "./guard-worksite-section";

export default function GuardMainPage() {
  return (
    <div className="guard-main-page">
      <GuardWorksiteSection />

      <section aria-label="근무자 바로가기" className="guard-main-menu">
        <Link className="guard-menu-button" href="/guard/main/safety">
          안전교육
        </Link>
        <Link className="guard-menu-button" href="/guard/main/work">
          순찰
        </Link>
        <Link className="guard-menu-button" href="/guard/main/special-remarks">
          특이사항 보고
        </Link>
        <Link className="guard-menu-button" href="/guard/main/profile">
          근무 정보
        </Link>
      </section>
    </div>
  );
}
