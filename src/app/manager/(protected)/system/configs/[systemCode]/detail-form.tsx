"use client";

import { useEffect, useState, type ComponentProps } from "react";
import type { DetailViewProps } from "@/components/modals/detail-modal-link";
import { isManagerThemeSystemCode, managerThemeSystemCode } from "@/lib/manager-theme";
import SystemConfigForm from "../system-config-form";
import ManagerLoadingMessage from "../../../manager-loading-message";

type Config = NonNullable<ComponentProps<typeof SystemConfigForm>["initialConfig"]>;

export default function SystemConfigDetail({ recordId, onClose, onSaved, onDeleted }: DetailViewProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const isTheme = isManagerThemeSystemCode(recordId ?? "");
        const response = await fetch(isTheme ? "/api/system/configs" : `/api/system/configs/${encodeURIComponent(recordId ?? "")}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "시스템설정을 불러오지 못했습니다.");
        const nextConfig = isTheme
          ? { system_code: managerThemeSystemCode, parent_system_code: null, description: (payload.configs as Config[] | undefined)?.find((item) => isManagerThemeSystemCode(item.system_code))?.description ?? null, content: "system" }
          : payload.config;
        if (!nextConfig) throw new Error("시스템설정을 불러오지 못했습니다.");
        if (!controller.signal.aborted) setConfig(nextConfig);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "시스템설정을 불러오지 못했습니다.");
      }
    }
    void load();
    return () => controller.abort();
  }, [recordId]);
  return error ? <p role="alert" className="text-destructive">{error}</p> : config
    ? <SystemConfigForm mode="edit" initialConfig={config} modal onClose={onClose} onSaved={onSaved} onDeleted={onDeleted} />
    : <ManagerLoadingMessage />;
}
