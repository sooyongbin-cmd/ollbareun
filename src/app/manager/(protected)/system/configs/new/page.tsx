import { listSystemConfigs } from "@/lib/system-configs";
import SystemConfigForm from "../system-config-form";

export default async function NewSystemConfigPage() {
  const configs = await listSystemConfigs();

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">시스템설정 등록</h1>
        <p className="mt-2 max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
          새 시스템 코드를 등록합니다.
        </p>
      </header>

      <SystemConfigForm mode="create" parentSystemCodes={configs.map((config) => config.system_code)} />
    </section>
  );
}
