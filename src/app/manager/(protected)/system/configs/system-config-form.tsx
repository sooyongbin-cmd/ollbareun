"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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

      router.push("/manager/system/configs");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "시스템설정을 삭제하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50 space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="system-config-description">
          설명
        </label>
        <textarea
          className="field min-h-[96px] resize-y"
          id="system-config-description"
          onChange={(event) => setDescription(event.target.value)}
          value={description}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="system-config-content">
          내용
        </label>
        <textarea
          className="field min-h-[180px] resize-y"
          id="system-config-content"
          onChange={(event) => setContent(event.target.value)}
          value={content}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="system-code">
          시스템코드
        </label>
        <input
          className="field"
          disabled={mode === "edit"}
          id="system-code"
          onChange={(event) => setSystemCode(event.target.value)}
          value={systemCode}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="parent-system-code">
          상위시스템코드
        </label>
        <input
          className="field"
          id="parent-system-code"
          onChange={(event) => setParentSystemCode(event.target.value)}
          value={parentSystemCode}
        />
      </div>

      {error ? <p className="status-warn">{error}</p> : null}

      <div className="flex flex-col gap-3 md:flex-row md:justify-end">
        {mode === "edit" ? (
          <button className="button-secondary" disabled={saving} onClick={handleDelete} type="button">
            삭제
          </button>
        ) : null}
        <button className="button-primary" disabled={saving} type="submit">
          저장
        </button>
      </div>
    </form>
  );
}
