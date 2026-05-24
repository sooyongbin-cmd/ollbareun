import Link from "next/link";

export default function GuardMainPage() {
  const pendingActions = ["안전교육", "근무지확인", "퇴근하기", "개인프로필"];

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <section className="max-w-[600px] mx-auto bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <Link className="button-primary flex w-full" href="/guard/main/attendance">
          출근하기
        </Link>
        <div className="mt-4 flex flex-col gap-3">
          {pendingActions.map((label) => (
            <button key={label} className="button-secondary w-full" type="button">
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
