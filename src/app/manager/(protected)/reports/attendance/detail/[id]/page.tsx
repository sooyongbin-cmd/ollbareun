"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import type { AttendanceRecord } from "@/lib/manager-reports";
import type { AttendanceEducationItem } from "@/lib/education-completions";

type ResponsePayload = { attendance: AttendanceRecord; education: AttendanceEducationItem[] };

const educationTypeLabels: Record<AttendanceEducationItem["educationType"], string> = {
  daily: "일일",
  monthly: "월별",
  quarterly: "분기",
  semiannual: "반기",
};
const educationTypeOrder: AttendanceEducationItem["educationType"][] = ["daily", "monthly", "quarterly", "semiannual"];

export default function AttendanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [education, setEducation] = useState<AttendanceEducationItem[]>([]);
  const [selectedEducationIds, setSelectedEducationIds] = useState<string[]>([]);
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
      if (active) {
        const attendance = (payload as ResponsePayload).attendance;
        setRecord(attendance);
        setEducation((payload as ResponsePayload).education ?? []);
        setClockInDateTime(toDateTimeLocal(attendance.clockInDateTime));
        setClockOutDateTime(toDateTimeLocal(attendance.clockOutDateTime));
      }
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "근태 기록을 불러오지 못했습니다.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clockInDateTime && !clockOutDateTime && selectedEducationIds.length === 0) {
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
          educationResourceIds: selectedEducationIds,
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

  function toggleEducation(resourceId: string) {
    setSelectedEducationIds((previous) => previous.includes(resourceId)
      ? previous.filter((selectedId) => selectedId !== resourceId)
      : [...previous, resourceId]);
  }

  function returnToList() {
    const query = record?.workDate ? `?${new URLSearchParams({ workDate: record.workDate })}` : "";
    router.push(`/manager/reports/attendance${query}`);
  }

  return <section className="space-y-6">
    <header><h1 className="text-[1.75rem] leading-[1.2]">근태상세</h1></header>
    <section className="rounded-xl border border-border/50 bg-muted/40 p-8">
      {loading ? <ManagerLoadingMessage /> : error && !record ? <p role="alert" className="text-destructive">{error}</p> : record ? <form className="space-y-6" onSubmit={submit}>
        <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="근태 정보">
          {readOnlyFields.map((field) => <div className="space-y-2" key={field.id}>
            <label className="ml-1 text-sm font-semibold text-muted-foreground" htmlFor={field.id}>{field.label}</label>
            <Input className="w-full bg-muted/50" id={field.id} value={field.value || "-"} readOnly />
          </div>)}
          <div className="space-y-2"><label className="ml-1 text-sm font-semibold text-muted-foreground" htmlFor="clock-in-date-time">출근일시</label>
            <Input id="clock-in-date-time" type="datetime-local" value={clockInDateTime} onChange={(event) => setClockInDateTime(event.target.value)} /></div>
          <div className="space-y-2"><label className="ml-1 text-sm font-semibold text-muted-foreground" htmlFor="clock-out-date-time">퇴근일시</label>
            <Input id="clock-out-date-time" type="datetime-local" value={clockOutDateTime} onChange={(event) => setClockOutDateTime(event.target.value)} /></div>
        </fieldset>
        <hr className="border-border/60" />
        <section aria-labelledby="attendance-education-heading" className="space-y-4">
          <h2 id="attendance-education-heading" className="text-lg font-semibold">교육이수 현황</h2>
          <div className="space-y-3">
            {educationTypeOrder.map((type) => {
              const items = education.filter((item) => item.educationType === type);
              return <div key={type} className="grid gap-2 sm:grid-cols-[5rem_1fr] sm:items-start">
                <h3 className="pt-2 text-sm font-semibold text-muted-foreground">{educationTypeLabels[type]}</h3>
                <div className="flex flex-wrap gap-2">
                  {items.length ? items.map((item) => {
                    const selected = selectedEducationIds.includes(item.resourceId);
                    return <div key={item.resourceId} className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-3 py-2">
                      <span className="text-sm">{item.title}</span>
                      {item.isCompleted ? <span className="text-sm font-semibold text-emerald-700">이수</span> :
                        <Button type="button" size="sm" variant={selected ? "default" : "outline"}
                          aria-label={`${item.title} 이수 처리`} aria-pressed={selected}
                          onClick={() => toggleEducation(item.resourceId)}>
                          {selected ? "이수 예정" : "이수"}
                        </Button>}
                    </div>;
                  }) : <p className="py-2 text-sm text-muted-foreground">등록된 교육이 없습니다.</p>}
                </div>
              </div>;
            })}
          </div>
        </section>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-3">
          <Button type="submit">저장</Button>
          <Button className="ml-auto" type="button" variant="outline" onClick={returnToList}>목록</Button>
        </div>
      </form> : null}
    </section>
    <ConfirmModal isOpen={confirmOpen} onClose={() => { if (!saving) setConfirmOpen(false); }} onConfirm={save} title="근태 정보를 저장할까요?" loading={saving} loadingLabel="저장 중입니다..." />
    <AlertModal isOpen={successOpen} onClose={() => { setSuccessOpen(false); returnToList(); }} title="알림"
      description={selectedEducationIds.length ? "근태 정보와 선택한 교육이수가 저장되었습니다." : "근태 정보가 저장되었습니다."} />
  </section>;
}

function toDateTimeLocal(value: string | null) {
  if (!value || value === "-") return "";
  return value.replace(" ", "T");
}
