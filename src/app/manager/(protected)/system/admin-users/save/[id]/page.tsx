"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import ConfirmModal from "@/components/modals/confirm-modal";
import ProcessingModal from "@/components/modals/processing-modal";
import AlertModal from "@/components/modals/alert-modal";
import ManagerLoadingMessage from "../../../../manager-loading-message";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<"PATCH" | "DELETE" | null>(null);
  const busyRef = useRef(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/manager/admin-users/${id}`, { cache: "no-store" }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "관리자 조회에 실패했습니다.");
      if (active) {
        setEmail(payload.admin.email);
        setRole(payload.admin.role);
        setCanEdit(payload.canEdit);
      }
    }).catch((err) => { if (active) setError(err instanceof Error ? err.message : "조회에 실패했습니다."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function submit(method: "PATCH" | "DELETE") {
    if (busyRef.current || !canEdit) return;
    busyRef.current = true;
    setAction(method);
    try {
      const response = await fetch(`/api/manager/admin-users/${id}`, {
        method,
        ...(method === "PATCH" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) } : {}),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "처리에 실패했습니다.");
      router.push("/manager/system/admin-users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      busyRef.current = false;
      setAction(null);
      setConfirmDelete(false);
    }
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit("PATCH");
  }
  return <section className="space-y-6">
    <h1 className="text-[1.75rem]">관리자 상세</h1>
    {loading ? <ManagerLoadingMessage /> : <form onSubmit={save} className="manager-section space-y-6 rounded-xl border border-border/50 bg-muted/40">
      <div className="space-y-2"><label htmlFor="admin-email">관리자이메일</label>
        <Input id="admin-email" type="email" required value={email} disabled={!canEdit || Boolean(action)} onChange={(event) => setEmail(event.target.value)} /></div>
      <div className="space-y-2"><label htmlFor="admin-role">직군</label>
        <NativeSelect id="admin-role" value={role} disabled={!canEdit || Boolean(action)} onChange={(event) => setRole(event.target.value)}>
          <NativeSelectOption value="admin">일반 관리자</NativeSelectOption><NativeSelectOption value="super_admin">최고 관리자</NativeSelectOption>
        </NativeSelect></div>
      <div className="flex gap-2"><Button type="submit" disabled={!canEdit || Boolean(action)}>저장</Button>
        <Button type="button" variant="destructive" disabled={!canEdit || Boolean(action)} onClick={() => setConfirmDelete(true)}>삭제</Button>
        <Button type="button" variant="outline" className="ml-auto" disabled={Boolean(action)} onClick={() => router.push("/manager/system/admin-users")}>목록</Button></div>
    </form>}
    <ConfirmModal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => void submit("DELETE")}
      title="관리자를 삭제하시겠습니까?" description={`이메일(${email})의 관리자 등록 정보를 삭제합니다.`} loading={action === "DELETE"} loadingLabel="삭제처리중입니다..." />
    <ProcessingModal isOpen={action === "PATCH"} message="저장처리중입니다..." />
    <AlertModal isOpen={Boolean(error)} onClose={() => setError("")} title="오류" description={error} />
  </section>;
}
