"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import type { AttendanceRecord } from "@/lib/manager-reports";

type ResponsePayload = { attendance: AttendanceRecord };

export default function AttendanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [clockInDateTime, setClockInDateTime] = useState("");
  const [clockOutDateTime, setClockOutDateTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/manager/reports/attendance/${id}`).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "근태 기록을 불러오지 못했습니다.");
      if (active) setRecord((payload as ResponsePayload).attendance);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "근태 기록을 불러오지 못했습니다.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clockInDateTime && !clockOutDateTime) {
      setError("저장할 출근일시 또는 퇴근일시를 입력하세요.");
      return;
    }
    setError("");
    setConfirmOpen(true);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/manager/reports/attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(clockInDateTime ? { clockInDateTime } : {}),
          ...(clockOutDateTime ? { clockOutDateTime } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "근태 기록을 저장하지 못했습니다.");
      setConfirmOpen(false);
      setSuccessOpen(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "근태 기록을 저장하지 못했습니다.");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const readOnlyFields = record ? [
    { id: "attendance-work-date", label: "출근날짜", value: record.workDate },
    { id: "attendance-employee-name", label: "이름", value: record.employeeName },
    { id: "attendance-work-style", label: "근무형태", value: record.workStyle },
    { id: "attendance-worksite", label: "근무지", value: record.worksiteName },
    { id: "attendance-scheduled-in", label: "출근예정", value: record.scheduledClockIn },
    { id: "attendance-scheduled-out", label: "퇴근예정", value: record.scheduledClockOut },
    { id: "attendance-status", label: "상태", value: record.status },
  ] : [];

  return <section className="space-y-6">
    <header><h1 className="text-[1.75rem] leading-[1.2]">근태상세</h1></header>
    <section className="rounded-xl border border-border/50 bg-muted/40 p-8">
      {loading ? <ManagerLoadingMessage /> : error && !record ? <p role="alert" className="text-destructive">{error}</p> : record ? <form className="space-y-6" onSubmit={submit}>
        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="근태 조회 정보">
          {readOnlyFields.map((field) => <div className="space-y-2" key={field.id}>
            <label className="ml-1 text-sm font-semibold text-muted-foreground" htmlFor={field.id}>{field.label}</label>
            <Input className="w-full bg-muted/50" id={field.id} value={field.value || "-"} readOnly />
          </div>)}
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2" aria-label="출퇴근 일시 입력">
          {record.scheduledClockIn !== "-" ? <div className="space-y-2"><label className="ml-1 text-sm font-semibold text-muted-foreground" htmlFor="clock-in-date-time">출근일시</label>
            <Input id="clock-in-date-time" type="datetime-local" value={clockInDateTime} onChange={(event) => setClockInDateTime(event.target.value)} /></div> : null}
          {record.scheduledClockOut !== "-" ? <div className="space-y-2"><label className="ml-1 text-sm font-semibold text-muted-foreground" htmlFor="clock-out-date-time">퇴근일시</label>
            <Input id="clock-out-date-time" type="datetime-local" value={clockOutDateTime} onChange={(event) => setClockOutDateTime(event.target.value)} /></div> : null}
        </fieldset>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-3">
          <Button type="submit">저장</Button>
          <Button className="ml-auto" type="button" variant="outline" onClick={() => router.push("/manager/reports/attendance")}>목록</Button>
        </div>
      </form> : null}
    </section>
    <ConfirmModal isOpen={confirmOpen} onClose={() => { if (!saving) setConfirmOpen(false); }} onConfirm={save} title="근태 정보를 저장할까요?" loading={saving} loadingLabel="저장 중입니다..." />
    <AlertModal isOpen={successOpen} onClose={() => { setSuccessOpen(false); router.push("/manager/reports/attendance"); }} title="알림" description="근태 정보가 저장되었습니다." />
  </section>;
}
