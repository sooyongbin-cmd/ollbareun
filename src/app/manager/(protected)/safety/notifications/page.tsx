import Link from "next/link";

export default function ManagerSafetyNotificationsPage() {
  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">교육알림</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            발송 이력은 저장하지 않습니다. 교육알림 실행은 월별교육이수 화면에서 할 수 있습니다.
          </p>
        </div>
      </header>

      <section aria-label="교육알림 안내" className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]">
        <p className="text-sm text-muted-foreground">
          교육알림을 실행하거나 전송 결과를 확인하려면 월별교육이수 화면을 이용하세요.
        </p>
        <Link className="mt-4 inline-block text-sm font-semibold text-primary underline underline-offset-4" href="/manager/safety/monthly_edu">
          월별교육이수로 이동
        </Link>
      </section>
    </section>
  );
}
