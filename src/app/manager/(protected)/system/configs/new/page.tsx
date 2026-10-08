import SystemConfigForm from "../system-config-form";

export default function NewSystemConfigPage() {
  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">시스템설정 등록</h1>
      </header>

      <SystemConfigForm mode="create" />
    </section>
  );
}
