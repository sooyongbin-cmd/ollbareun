import Link from "next/link";

export default function ManagerPage() {
  return (
    <section className="space-y-[80px]">
      <div className="space-y-[24px]">
        <header>
          <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">관리자 화면</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[600px]">
            출근 현황과 등록된 직원, 오늘 배정을 확인합니다.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/manager/employee/employees"
            className="rounded-[18px] border border-hairline bg-canvas-parchment p-6 hover:border-primary/30 transition-colors"
          >
            <div className="text-[14px] font-semibold text-ink-muted-48">직원 관리</div>
            <div className="mt-2 text-[20px] font-semibold">직원명부관리</div>
            <p className="mt-3 text-[14px] text-ink-muted-48 leading-relaxed">
              직원 목록을 검색하고 등록 화면으로 이동합니다.
            </p>
          </Link>
          <Link
            href="/manager/employee/employees/new"
            className="rounded-[18px] border border-hairline bg-canvas-parchment p-6 hover:border-primary/30 transition-colors"
          >
            <div className="text-[14px] font-semibold text-ink-muted-48">직원 등록</div>
            <div className="mt-2 text-[20px] font-semibold">직원등록</div>
            <p className="mt-3 text-[14px] text-ink-muted-48 leading-relaxed">
              이름과 연락처로 직원을 새로 등록합니다.
            </p>
          </Link>
          <Link
            href="/manager/employee/assignments"
            className="rounded-[18px] border border-hairline bg-canvas-parchment p-6 hover:border-primary/30 transition-colors"
          >
            <div className="text-[14px] font-semibold text-ink-muted-48">근무지 배정</div>
            <div className="mt-2 text-[20px] font-semibold">근무지배정</div>
            <p className="mt-3 text-[14px] text-ink-muted-48 leading-relaxed">
              직원과 근무지를 연결해 일정을 배정합니다.
            </p>
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-[24px] font-semibold mb-6">실시간 출근 현황</h2>
        <div className="bg-canvas border border-hairline rounded-[18px] overflow-hidden">
          <p className="p-6 text-[17px] text-ink-muted-48 italic">현재 출근 기록이 없습니다.</p>
        </div>
      </section>
    </section>
  );
}
