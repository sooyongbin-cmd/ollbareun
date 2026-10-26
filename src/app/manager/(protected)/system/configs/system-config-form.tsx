"use client";

import type { DetailData } from "@/lib/detail-changes";
import type { RegistrationFormProps } from "@/components/modals/registration-modal";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  isManagerThemeSystemCode,
  readManagerTheme,
  saveManagerThemeLocally,
} from "@/lib/manager-theme";
import { notifyManagerThemeChange } from "../../../manager-theme-provider";
import ConfirmModal from "@/components/modals/confirm-modal";
import ProcessingModal from "@/components/modals/processing-modal";

const managerThemeOptions = ["light", "dark", "system"] as const;

type SystemConfigFormProps = Omit<RegistrationFormProps, "onSaved"> & {
  onSaved?: (data?: DetailData) => void;
  mode: "create" | "edit";
  onDeleted?: () => void;
  initialConfig?: {
    system_code: string;
    parent_system_code: string | null;
    description: string | null;
    content: string;
  };
};

export default function SystemConfigForm({ mode, initialConfig, modal = false, onClose, onSaved, onDeleted }: SystemConfigFormProps) {
  const router = useRouter();
  const systemCode = initialConfig?.system_code ?? "";
  const isBooleanConfig = ["S000002", "special_001", "USE_QR_CODE"].includes(systemCode);
  const parentSystemCode = initialConfig?.parent_system_code ?? "";
  const [description, setDescription] = useState(initialConfig?.description ?? "");
  const [content, setContent] = useState(() =>
    isBooleanConfig
      ? (initialConfig?.content.trim().toUpperCase() === "Y" ? "Y" : "N")
      : initialConfig?.content ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const isThemeConfig = isManagerThemeSystemCode(systemCode);

  useEffect(() => {
    if (isThemeConfig) {
      setContent(readManagerTheme());
    }
  }, [isThemeConfig]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (isThemeConfig) {
        const theme = saveManagerThemeLocally(content);
        notifyManagerThemeChange(theme);
        onSaved?.({ ...initialConfig, system_code: systemCode, content: theme, description });
        return;
      }

      const response = await fetch(
        mode === "create" ? "/api/system/configs" : `/api/system/configs/${encodeURIComponent(systemCode)}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(mode === "edit" ? { systemCode, parentSystemCode } : {}),
            description,
            content,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "시스템설정을 저장하지 못했습니다.");
      }

      if (mode === "edit") {
        onSaved?.(payload.config);
        return;
      }
      if (onSaved) {
        onSaved();
        return;
      }
      router.push("/manager/system/configs");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "시스템설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialConfig?.system_code) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/system/configs/${encodeURIComponent(initialConfig.system_code)}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "시스템설정을 삭제하지 못했습니다.");
      }

      if (onDeleted) {
        onDeleted();
        return;
      }
      router.push("/manager/system/configs");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "시스템설정을 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="manager-section bg-muted/40 rounded-xl border border-border/50 space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="system-config-description">
          설명
        </label>
        <Textarea
          className="w-full min-h-[6rem] resize-y"
          id="system-config-description"
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" id="system-config-content-label" htmlFor={isThemeConfig || isBooleanConfig ? undefined : "system-config-content"}>
          내용
        </label>
        {isThemeConfig ? (
          <fieldset aria-labelledby="system-config-content-label" className="flex flex-wrap gap-5">
            {managerThemeOptions.map((theme) => (
              <label key={theme} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  className="size-4 accent-primary"
                  name="system-config-content"
                  onChange={() => setContent(theme)}
                  required
                  type="radio"
                  value={theme}
                  checked={content === theme}
                />
                {theme}
              </label>
            ))}
          </fieldset>
        ) : isBooleanConfig ? (
          <label className="flex min-h-10 w-fit cursor-pointer items-center gap-3 text-sm" htmlFor="system-config-content">
            <input
              aria-labelledby="system-config-content-label"
              checked={content === "Y"}
              className="size-5 accent-primary"
              disabled={saving}
              id="system-config-content"
              onChange={(event) => setContent(event.target.checked ? "Y" : "N")}
              type="checkbox"
            />
            <span aria-live="polite">{content}</span>
          </label>
        ) : (
          <Textarea
            className="w-full min-h-[11.25rem] resize-y"
            id="system-config-content"
            onChange={(event) => setContent(event.target.value)}
            value={content}
          />
        )}
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-3 md:flex-row md:justify-end">
        <Button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50" disabled={saving} type="submit">
          저장
        </Button>
        {mode === "edit" && !isThemeConfig ? (
          <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50" disabled={saving} onClick={() => setDeleteConfirmOpen(true)} type="button" variant="outline">
            삭제
          </Button>
        ) : null}
        <Button
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:ml-auto"
          disabled={saving}
          onClick={() => onClose ? onClose() : router.push("/manager/system/configs")}
          type="button"
          variant="outline"
        >
          {modal ? "닫기" : "목록"}
        </Button>
      </div>
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="시스템설정을 삭제하시겠습니까?"
        description="삭제하면 현재 시스템설정이 제거됩니다."
        loading={saving && deleteConfirmOpen}
        loadingLabel="삭제처리중입니다..."
      />
      <ProcessingModal isOpen={saving && !deleteConfirmOpen} message="저장처리중입니다..." />
    </form>
  );
}
