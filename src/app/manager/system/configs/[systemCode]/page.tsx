import { getSystemConfig } from "@/lib/system-configs";
import SystemConfigForm from "../system-config-form";

type PageProps = {
  params: Promise<{ systemCode: string }>;
};

export default async function EditSystemConfigPage({ params }: PageProps) {
  const { systemCode } = await params;
  const config = await getSystemConfig(decodeURIComponent(systemCode));

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">시스템설정 수정</h1>
        <p className="mt-2 max-w-[640px] text-[21px] font-normal text-ink-muted-48">
          시스템 코드의 내용을 수정하거나 삭제합니다.
        </p>
      </header>

      <SystemConfigForm mode="edit" initialConfig={config} />
    </section>
  );
}
