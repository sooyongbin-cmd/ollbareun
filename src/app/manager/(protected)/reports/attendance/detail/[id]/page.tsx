"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import type { AttendanceRecord } from "@/lib/manager-reports";
import type { AttendanceEducationItem } from "@/lib/education-completions";
import { parseLeaveTypes } from "@/lib/leave-types";

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
  const [leaveRequested, setLeaveRequested] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  const [leaveType, setLeaveType] = useState("");
  const [leaveTypeLoading, setLeaveTypeLoading] = useState(false);
  const [clockInDateTime, setClockInDateTime] = useState("");
  const [clockOutDateTime, setClockOutDateTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [errorAlert, setErrorAlert] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clockedInDeleteConfirmOpen, setClockedInDeleteConfirmOpen] = useState(false);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);

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

  const canRequestLeave = record?.intimeStatus === "0" && !clockInDateTime;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (leaveRequested && (clockInDateTime || clockOutDateTime || selectedEducationIds.length > 0)) {
      setErrorAlert("휴가신청은 출근·퇴근 처리 및 교육이수와 함께 할 수 없습니다.");
      return;
    }
    if (!clockInDateTime && selectedEducationIds.length > 0) {
      setErrorAlert("출근처리후 교육이수 처리해주세요.");
      return;
    }
    if (!clockInDateTime && !clockOutDateTime && selectedEducationIds.length === 0 && !leaveRequested) {
      setError("저장할 출근일시 또는 퇴근일시를 입력하세요.");
      return;
    }
    if (leaveRequested && !leaveType) {
      setErrorAlert("등록된 휴가구분을 선택하세요.");
      return;
    }
    setError("");
    setConfirmOpen(true);
  }

  async function toggleLeaveRequest() {
    if (leaveTypeLoading) return;
    if (!canRequestLeave) return;
    setError("");
    if (leaveRequested) {
      setLeaveRequested(false);
      return;
    }
    if (leaveTypes.length > 0) {
      setLeaveRequested(true);
      return;
    }

    setLeaveTypeLoading(true);
    setErrorAlert("");
    try {
      const response = await fetch("/api/system/configs/leave_code");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "휴가종류를 불러오지 못했습니다.");
      const types = parseLeaveTypes(payload.config?.content);
      if (types.length === 0) throw new Error("등록된 휴가구분이 없습니다. 관리자에게 문의해 주세요.");
      setLeaveTypes(types);
      setLeaveType((current) => types.includes(current) ? current : types[0] ?? "");
      setLeaveRequested(true);
    } catch (loadError) {
      setErrorAlert(loadError instanceof Error ? loadError.message : "휴가종류를 불러오지 못했습니다.");
    } finally {
      setLeaveTypeLoading(false);
    }
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
          ...(selectedEducationIds.length ? { educationResourceIds: selectedEducationIds } : {}),
          ...(leaveRequested && record ? {
            leaveRequested: true,
            leaveType,
            startDate: record.workDate,
            endDate: record.workDate,
          } : {}),
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

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setErrorAlert("");
    try {
      const response = await fetch(`/api/manager/reports/attendance/${id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "근태 기록을 삭제하지 못했습니다.");
      setDeleteConfirmOpen(false);
      setClockedInDeleteConfirmOpen(false);
      setDeleteSuccessOpen(true);
    } catch (deleteError) {
      setDeleteConfirmOpen(false);
      setClockedInDeleteConfirmOpen(false);
      setErrorAlert(deleteError instanceof Error ? deleteError.message : "근태 기록을 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  function confirmInitialDelete() {
    setDeleteConfirmOpen(false);
    if (record?.clockInDateTime && record.clockInDateTime !== "-") {
      setClockedInDeleteConfirmOpen(true);
      return;
    }
    void confirmDelete();
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
    router.push("/manager/reports/attendance");
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
            <Input id="clock-in-date-time" type="datetime-local" value={clockInDateTime} onChange={(event) => {
              setClockInDateTime(event.target.value);
              if (event.target.value) setLeaveRequested(false);
            }} /></div>
          <div className="space-y-2"><label className="ml-1 text-sm font-semibold text-muted-foreground" htmlFor="clock-out-date-time">퇴근일시</label>
            <Input id="clock-out-date-time" type="datetime-local" value={clockOutDateTime} onChange={(event) => setClockOutDateTime(event.target.value)} /></div>
        </fieldset>
        <hr className="border-border/60" />
        <section aria-labelledby="attendance-education-heading" className="space-y-4">
          <h2 id="attendance-education-heading" className="text-lg font-semibold">교육이수 현황</h2>
          <div className="grid grid-cols-1 gap-3 min-[641px]:grid-cols-2 min-[1280px]:grid-cols-4">
            {educationTypeOrder.map((type) => {
              const items = education.filter((item) => item.educationType === type);
              return <div key={type} className="grid min-w-0 gap-x-2 gap-y-1 min-[641px]:grid-cols-[3rem_1fr] min-[641px]:items-start">
                <h3 className="pt-2 text-sm font-semibold text-muted-foreground">{educationTypeLabels[type]}</h3>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {items.length ? items.map((item) => {
                    const selected = selectedEducationIds.includes(item.resourceId);
                    return <div key={item.resourceId} className="flex items-center gap-2 rounded-md border border-border/50 bg-background px-3 py-2">
                      <span className="text-sm">{item.title}</span>
                      {item.isCompleted ? <span className="text-sm font-semibold text-emerald-700">이수</span> :
                        <Button type="button" size="sm" variant={selected ? "default" : "outline"}
                          aria-label={`${item.title} 이수 처리`} aria-pressed={selected}
                          onClick={() => toggleEducation(item.resourceId)}>
                          {selected ? "이수" : "미이수"}
                        </Button>}
                    </div>;
                  }) : <p className="py-2 text-sm text-muted-foreground">등록된 교육이 없습니다.</p>}
                </div>
              </div>;
            })}
          </div>
        </section>
        <hr className="border-border/60" />
        <section aria-labelledby="attendance-leave-heading" className="space-y-4">
          <h2 id="attendance-leave-heading" className="text-lg font-semibold">휴가신청</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex h-9 items-center gap-3">
              <span id="attendance-leave-toggle-label" className="text-sm font-medium">휴가신청</span>
              <button
                type="button"
                role="switch"
                aria-labelledby="attendance-leave-toggle-label"
                aria-checked={leaveRequested}
                disabled={!canRequestLeave || leaveTypeLoading}
                onClick={() => void toggleLeaveRequest()}
                title={!canRequestLeave ? "결근 상태이며 출근일시가 없는 경우에만 휴가신청할 수 있습니다." : undefined}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${leaveRequested ? "border-primary bg-primary" : "border-input bg-muted"}`}
              >
                <span aria-hidden="true" className={`inline-block size-4 rounded-full bg-background shadow transition-transform ${leaveRequested ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            {leaveRequested ? (
              <div className="w-full max-w-sm space-y-2 sm:w-64">
                <label className="ml-1 text-sm font-semibold text-muted-foreground" htmlFor="attendance-leave-type">휴가종류</label>
                <NativeSelect id="attendance-leave-type" value={leaveType} onChange={(event) => setLeaveType(event.target.value)} required>
                  <NativeSelectOption value="">선택하세요.</NativeSelectOption>
                  {leaveTypes.map((type) => <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>)}
                </NativeSelect>
              </div>
            ) : null}
          </div>
          {leaveRequested ? (
            <>
              <input type="hidden" name="startDate" defaultValue={record.workDate} />
              <input type="hidden" name="endDate" defaultValue={record.workDate} />
            </>
          ) : null}
        </section>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving || deleting}>저장</Button>
          <Button type="button" variant="destructive" disabled={saving || deleting} onClick={() => setDeleteConfirmOpen(true)}>삭제</Button>
          <Button className="ml-auto" type="button" variant="outline" disabled={saving || deleting} onClick={returnToList}>목록</Button>
        </div>
      </form> : null}
    </section>
    <ConfirmModal isOpen={confirmOpen} onClose={() => { if (!saving) setConfirmOpen(false); }} onConfirm={save} title="변경사항을 저장할까요?" loading={saving} loadingLabel="저장 중입니다..." />
    <ConfirmModal isOpen={deleteConfirmOpen} onClose={() => { if (!deleting) setDeleteConfirmOpen(false); }} onConfirm={confirmInitialDelete} title="자료를 삭제하시겠습니까?" description="삭제한 자료는 복구할 수 없습니다." loading={deleting} loadingLabel="삭제 중입니다..." />
    <ConfirmModal isOpen={clockedInDeleteConfirmOpen} onClose={() => { if (!deleting) setClockedInDeleteConfirmOpen(false); }} onConfirm={confirmDelete} title="출근처리된 자료입니다. 그래도 삭제하시겠습니까?" description="삭제한 자료는 복구할 수 없습니다." loading={deleting} loadingLabel="삭제 중입니다..." />
    <AlertModal isOpen={Boolean(errorAlert)} onClose={() => setErrorAlert("")} title="오류" description={errorAlert} />
    <AlertModal isOpen={successOpen} onClose={() => { setSuccessOpen(false); returnToList(); }} title="알림"
      description={leaveRequested ? "휴가 신청이 완료되었습니다." : selectedEducationIds.length ? "근태 정보와 선택한 교육이수가 저장되었습니다." : "근태 정보가 저장되었습니다."} />
    <AlertModal isOpen={deleteSuccessOpen} onClose={() => { setDeleteSuccessOpen(false); returnToList(); }} title="알림" description="자료가 삭제되었습니다" />
  </section>;
}

function toDateTimeLocal(value: string | null) {
  if (!value || value === "-") return "";
  return value.replace(" ", "T");
}
