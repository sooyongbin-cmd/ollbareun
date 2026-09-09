"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SaveIcon } from "@/components/icons/save-icon";
import { CancelIcon } from "@/components/icons/cancel-icon";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import ManagerLoadingMessage from "../../../manager-loading-message";

type Option = { id: string; name: string };

export default function AttendanceNewPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Option[]>([]);
  const [worksites, setWorksites] = useState<Option[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [worksiteId, setWorksiteId] = useState("");
  const [clockInDateTime, setClockInDateTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOptions() {
      try {
        const response = await fetch("/api/bootstrap", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "등록 정보를 불러오지 못했습니다.");
        if (!controller.signal.aborted) {
          setEmployees(data.employees ?? []);
          setWorksites(data.worksites ?? []);
          setClockInDateTime(new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16));
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "등록 정보를 불러오지 못했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadOptions();
    return () => controller.abort();
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmOpen(true);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/manager/reports/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, worksiteId, clockInDateTime }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "출근 등록에 실패했습니다.");
      setSuccessOpen(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "출근 등록에 실패했습니다.");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">출근등록</h1>
          <p className="text-[0.875rem] text-muted-foreground">직원과 근무지를 선택하고 출근일시를 입력합니다.</p>
        </div>
      </header>
      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? <ManagerLoadingMessage /> : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[
                { id: "employee-id", label: "직원이름", value: employeeId, setValue: setEmployeeId, options: employees },
                { id: "worksite-id", label: "근무지", value: worksiteId, setValue: setWorksiteId, options: worksites },
              ].map((field) => (
                <div className="space-y-2" key={field.id}>
                  <label className="text-sm font-semibold text-muted-foreground" htmlFor={field.id}>{field.label}</label>
                  <NativeSelect id={field.id} className="w-full" value={field.value} onChange={(event) => field.setValue(event.target.value)} required>
                    <NativeSelectOption value="">선택하세요</NativeSelectOption>
                    {field.options.map((option) => <NativeSelectOption key={option.id} value={option.id}>{option.name}</NativeSelectOption>)}
                  </NativeSelect>
                </div>
              ))}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground" htmlFor="clock-in-date-time">출근일시</label>
                <Input id="clock-in-date-time" type="datetime-local" value={clockInDateTime} onChange={(event) => setClockInDateTime(event.target.value)} required />
              </div>
            </div>
            <div className="flex gap-3">
              <Button aria-label="저장" title="저장" type="submit" disabled={saving || successOpen}><SaveIcon size={20} /></Button>
              <Link aria-label="취소" title="취소" href="/manager/reports/attendance" className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50"><CancelIcon size={20} /></Link>
            </div>
          </form>
        )}
        {error && <p role="alert" className="mt-6 text-destructive">{error}</p>}
      </section>
      <ConfirmModal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleSave} title="출근 기록을 등록하시겠습니까?" loading={saving} />
      <AlertModal isOpen={successOpen} onClose={() => router.push("/manager/reports/attendance")} title="알림" description="등록이 완료되었습니다." />
    </section>
  );
}
