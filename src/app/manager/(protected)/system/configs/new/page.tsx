import SystemConfigForm from "../system-config-form";

export default function NewSystemConfigPage() {
  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[28px] leading-[1.2]">시스템설정 등록</h1>
        <p className="mt-2 max-w-[640px] text-[14px] font-normal leading-relaxed text-muted-foreground">
          새 시스템 코드를 등록합니다.
        </p>
      </header>

      <SystemConfigForm mode="create" />
    </section>
  );
}
