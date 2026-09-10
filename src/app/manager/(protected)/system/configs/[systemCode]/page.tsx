import { getSystemConfig } from "@/lib/system-configs";
import SystemConfigForm from "../system-config-form";

type PageProps = {
  params: Promise<{ systemCode: string }>;
};

export default async function EditSystemConfigPage({ params }: PageProps) {
  const { systemCode } = await params;
  const config = await getSystemConfig(decodeURIComponent(systemCode));

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">시스템설정 상세</h1>
        <p className="mt-2 max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
          시스템 코드의 내용을 수정하거나 삭제합니다.
        </p>
      </header>

      <SystemConfigForm mode="edit" initialConfig={config} />
    </section>
  );
}
