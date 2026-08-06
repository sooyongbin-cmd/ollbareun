"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { notifyManagerThemeChange } from "../../../manager-theme-provider";

type SystemConfigFormProps = {
  mode: "create" | "edit";
  initialConfig?: {
    system_code: string;
    parent_system_code: string | null;
    description: string | null;
    content: string;
  };
};

export default function SystemConfigForm({ mode, initialConfig }: SystemConfigFormProps) {
  const router = useRouter();
  const [systemCode, setSystemCode] = useState(initialConfig?.system_code ?? "");
  const [parentSystemCode, setParentSystemCode] = useState(initialConfig?.parent_system_code ?? "");
  const [description, setDescription] = useState(initialConfig?.description ?? "");
  const [content, setContent] = useState(initialConfig?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        mode === "create" ? "/api/system/configs" : `/api/system/configs/${encodeURIComponent(systemCode)}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemCode,
            parentSystemCode,
            description,
            content,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "시스템설정을 저장하지 못했습니다.");
      }

      if (systemCode.trim().toUpperCase() === "THEME_CODE") {
        notifyManagerThemeChange(content);
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

      if (initialConfig.system_code.trim().toUpperCase() === "THEME_CODE") {
        notifyManagerThemeChange("system");
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
    <form className="bg-muted/40 rounded-xl p-[2rem] border border-border/50 space-y-5" onSubmit={handleSubmit}>
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
        <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="system-config-content">
          내용
        </label>
        <Textarea
          className="w-full min-h-[11.25rem] resize-y"
          id="system-config-content"
          onChange={(event) => setContent(event.target.value)}
          value={content}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="system-code">
          시스템코드
        </label>
        <Input
          className="w-full"
          disabled={mode === "edit"}
          id="system-code"
          onChange={(event) => setSystemCode(event.target.value)}
          value={systemCode}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="parent-system-code">
          상위시스템코드
        </label>
        <Input
          className="w-full"
          id="parent-system-code"
          onChange={(event) => setParentSystemCode(event.target.value)}
          value={parentSystemCode}
        />
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-3 md:flex-row md:justify-end">
        {mode === "edit" ? (
          <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50" disabled={saving} onClick={handleDelete} type="button" variant="outline">
            삭제
          </Button>
        ) : null}
        <Button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50" disabled={saving} type="submit">
          저장
        </Button>
      </div>
    </form>
  );
}
