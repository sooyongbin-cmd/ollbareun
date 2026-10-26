"use client";

import type { RegistrationFormProps } from "@/components/modals/registration-modal";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import ProcessingModal from "@/components/modals/processing-modal";
import AlertModal from "@/components/modals/alert-modal";

export default function NewAdminUserPage({ modal = false, onClose, onSaved }: RegistrationFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch("/api/manager/admin-users", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "관리자 등록에 실패했습니다.");
      if (onSaved) {
        onSaved({ record: payload.admin });
        return;
      }
      router.push("/manager/system/admin-users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 등록에 실패했습니다.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return <section className="space-y-6">
    {!modal ? <h1 className="text-[1.75rem]">관리자등록</h1> : null}
    <form onSubmit={save} className="manager-section space-y-6 rounded-xl border border-border/50 bg-muted/40">
      <div className="space-y-2"><label htmlFor="admin-email">관리자이메일</label>
        <Input id="admin-email" type="email" required value={email} disabled={saving} onChange={(event) => setEmail(event.target.value)} /></div>
      <div className="space-y-2"><label htmlFor="admin-role">직군 설정</label>
        <NativeSelect id="admin-role" value={role} disabled={saving} onChange={(event) => setRole(event.target.value)}>
          <NativeSelectOption value="admin">일반 관리자</NativeSelectOption><NativeSelectOption value="super_admin">최고 관리자</NativeSelectOption>
        </NativeSelect></div>
      <div className="flex gap-2"><Button type="submit" disabled={saving}>저장</Button>
        <Button type="button" variant="outline" disabled={saving} onClick={() => onClose ? onClose() : router.push("/manager/system/admin-users")}>{modal ? "닫기" : "목록"}</Button></div>
    </form>
    <ProcessingModal isOpen={saving} message="저장처리중입니다..." />
    <AlertModal isOpen={Boolean(error)} onClose={() => setError("")} title="오류" description={error} />
  </section>;
}
