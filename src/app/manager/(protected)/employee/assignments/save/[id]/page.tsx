"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import { SaveIcon } from "@/components/icons/save-icon";
import { DeleteIcon } from "@/components/icons/delete-icon";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import ProcessingModal from "@/components/modals/processing-modal";
import AssignmentDaysOffCalendar, { type DailyAttendance } from "./assignment-days-off-calendar";

type Assignment = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
};

type Employee = {
  id: string;
  name: string;
};

type Worksite = {
  id: string;
  name: string;
};

type AssignmentResponse = {
  assignment: Assignment;
};

type DaysOffResponse = {
  daysOff: { day_off_date: string }[];
};

type Bootstrap = {
  employees: Employee[];
  worksites: Worksite[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "자료를 불러오지 못했습니다.");
  }

  return payload as T;
}

async function deleteRequest(url: string): Promise<void> {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "자료를 삭제하지 못했습니다.");
  }
}

export default function AssignmentSavePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assignmentId = params.id;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [worksiteId, setWorksiteId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [savedStartDate, setSavedStartDate] = useState("");
  const [savedEndDate, setSavedEndDate] = useState("");
  const [currentMonth, setCurrentMonth] = useState("");
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [daysOff, setDaysOff] = useState<Set<string>>(new Set());
  const [pendingDayOff, setPendingDayOff] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(assignmentId));
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAfterTodayConfirmOpen, setDeleteAfterTodayConfirmOpen] = useState(false);
  const [deleteWithAttendanceConfirmOpen, setDeleteWithAttendanceConfirmOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [assignmentPayload, bootstrapPayload, daysOffPayload, dailyAttendancePayload] = await Promise.all([
          fetchJson<AssignmentResponse>(`/api/assignments/${assignmentId}`),
          fetchJson<Bootstrap>("/api/bootstrap"),
          fetchJson<DaysOffResponse>(`/api/manager/assignments/${assignmentId}/days-off`),
          fetchJson<{ dailyAttendance: DailyAttendance[] }>(`/api/manager/assignments/${assignmentId}/daily-attendance`),
        ]);

        if (!ignore) {
          setDailyAttendance(dailyAttendancePayload.dailyAttendance ?? []);
          setEmployeeId(assignmentPayload.assignment.employee_id);
          setWorksiteId(assignmentPayload.assignment.worksite_id);
          setStartDate(assignmentPayload.assignment.start_date);
          setEndDate(assignmentPayload.assignment.end_date);
          setSavedStartDate(assignmentPayload.assignment.start_date);
          setSavedEndDate(assignmentPayload.assignment.end_date);
          setCurrentMonth(assignmentPayload.assignment.start_date.slice(0, 7));
          setDaysOff(new Set((daysOffPayload.daysOff ?? []).map((dayOff) => dayOff.day_off_date)));
          setEmployees(bootstrapPayload.employees ?? []);
          setWorksites(bootstrapPayload.worksites ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "자료를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (!assignmentId) {
      return () => {
        ignore = true;
      };
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [assignmentId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      await fetchJson<AssignmentResponse>(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          worksiteId,
          startDate,
          endDate,
        }),
      });

      setAlertMessage("자료가 저장되었습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "자료를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    setErrorAlertMessage("");

    try {
      await deleteRequest(`/api/assignments/${assignmentId}`);
      setAlertMessage("자료가 삭제되었습니다.");
    } catch (deleteError) {
      setErrorAlertMessage(deleteError instanceof Error ? deleteError.message : "자료를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  async function handleDeleteIncludingAttendance() {
    setDeleting(true);
    setError("");
    setErrorAlertMessage("");

    try {
      await deleteRequest(`/api/assignments/${assignmentId}?includeAttendance=true`);
      setAlertMessage("자료가 삭제되었습니다.");
    } catch (deleteError) {
      setErrorAlertMessage(deleteError instanceof Error ? deleteError.message : "자료를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
      setDeleteWithAttendanceConfirmOpen(false);
    }
  }

  async function handleDeleteAfterToday() {
    setDeleting(true);
    setError("");
    setErrorAlertMessage("");

    try {
      await deleteRequest(`/api/assignments/${assignmentId}?afterToday=true`);
      setAlertMessage("오늘 이후 자료가 삭제되었습니다.");
    } catch (deleteError) {
      setErrorAlertMessage(deleteError instanceof Error ? deleteError.message : "자료를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
      setDeleteAfterTodayConfirmOpen(false);
    }
  }

  async function handleToggleDayOff(date: string) {
    if (pendingDayOff) return;

    const wasDayOff = daysOff.has(date);
    const nextDaysOff = new Set(daysOff);
    if (wasDayOff) {
      nextDaysOff.delete(date);
    } else {
      nextDaysOff.add(date);
    }

    setDaysOff(nextDaysOff);
    setPendingDayOff(date);
    setError("");

    try {
      const url = `/api/manager/assignments/${assignmentId}/days-off/${encodeURIComponent(date)}`;
      const response = await fetch(url, { method: wasDayOff ? "DELETE" : "PUT" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "휴무일을 처리하지 못했습니다.");
      }
    } catch (toggleError) {
      setDaysOff(new Set(daysOff));
      setError(toggleError instanceof Error ? toggleError.message : "휴무일을 처리하지 못했습니다.");
    } finally {
      setPendingDayOff(null);
    }
  }

  const periodChanged = startDate !== savedStartDate || endDate !== savedEndDate;

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">근무지배정 상세</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            선택한 배정의 직원, 근무지, 근무기간을 수정합니다.
          </p>
        </div>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="text-[1rem] text-destructive">{error}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-employee">
                  직원
                </label>
                <NativeSelect
                  className="w-full appearance-none"
                  id="assignment-employee"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  required
                >
                  <NativeSelectOption value="">선택</NativeSelectOption>
                  {employees.map((employee) => (
                    <NativeSelectOption key={employee.id} value={employee.id}>
                      {employee.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-worksite">
                  근무지
                </label>
                <NativeSelect
                  className="w-full appearance-none"
                  id="assignment-worksite"
                  value={worksiteId}
                  onChange={(event) => setWorksiteId(event.target.value)}
                  required
                >
                  <NativeSelectOption value="">선택</NativeSelectOption>
                  {worksites.map((worksite) => (
                    <NativeSelectOption key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="text-[0.875rem] font-semibold text-muted-foreground ml-1">근무기간</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="sr-only" htmlFor="assignment-start-date">
                    시작일
                  </label>
                  <Input
                    aria-label="시작일"
                    className="w-full"
                    id="assignment-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    required
                  />
                  <label className="sr-only" htmlFor="assignment-end-date">
                    종료일
                  </label>
                  <Input
                    aria-label="종료일"
                    className="w-full"
                    id="assignment-end-date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button aria-label="저장" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto" disabled={saving || deleting} type="submit">
                <SaveIcon size={20} />
              </Button>
              <Button
                aria-label="삭제"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                type="button"
                disabled={saving || deleting}
                onClick={() => setDeleteConfirmOpen(true)}
                variant="outline"
              >
                <DeleteIcon size={20} />
              </Button>
              <Button
                aria-label="오늘이후삭제"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-destructive/50 bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                type="button"
                disabled={saving || deleting}
                onClick={() => setDeleteAfterTodayConfirmOpen(true)}
                variant="outline"
              >
                <DeleteIcon size={20} />
                <span>오늘이후삭제</span>
              </Button>
              <Button
                aria-label="전체자료삭제"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-destructive/50 bg-background px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                type="button"
                disabled={saving || deleting}
                onClick={() => setDeleteWithAttendanceConfirmOpen(true)}
                variant="outline"
              >
                <DeleteIcon size={20} />
                <span>전체자료삭제</span>
              </Button>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[1rem] text-destructive">{error}</p> : null}

        {!loading && savedStartDate && savedEndDate && currentMonth ? (
          <AssignmentDaysOffCalendar
            dailyAttendance={dailyAttendance}
            currentMonth={currentMonth}
            daysOff={daysOff}
            disabled={periodChanged}
            endDate={savedEndDate}
            onMonthChange={setCurrentMonth}
            onToggle={handleToggleDayOff}
            pendingDate={pendingDayOff}
            startDate={savedStartDate}
          />
        ) : null}
      </section>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="자료를 삭제하시겠습니까?"
        description="삭제하면 현재 배정 자료가 완전히 제거됩니다."
        loading={deleting}
        loadingLabel="삭제처리중입니다..."
      />

      <ConfirmModal
        isOpen={deleteAfterTodayConfirmOpen}
        onClose={() => setDeleteAfterTodayConfirmOpen(false)}
        onConfirm={handleDeleteAfterToday}
        title="오늘 이후 자료를 포함하여 배정을 삭제할까요?"
        description="오늘 출근한 자료는 보존하고, 오늘 이후의 자료를 삭제합니다. 삭제한 자료는 복구할 수 없습니다."
        loading={deleting}
        loadingLabel="삭제처리중입니다..."
      />

      <ConfirmModal
        isOpen={deleteWithAttendanceConfirmOpen}
        onClose={() => setDeleteWithAttendanceConfirmOpen(false)}
        onConfirm={handleDeleteIncludingAttendance}
        title="현재 발생한 근태자료를 포함하여 모두 삭제할까요?"
        description="삭제한 자료는 복구할 수 없습니다."
        loading={deleting}
        loadingLabel="삭제처리중입니다..."
      />

      <ProcessingModal isOpen={saving} message="저장처리중입니다..." />

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => {
          setAlertMessage("");
          router.push("/manager/employee/assignments");
        }}
        title="알림"
        description={alertMessage}
      />

      <AlertModal
        isOpen={Boolean(errorAlertMessage)}
        onClose={() => setErrorAlertMessage("")}
        title="삭제 오류"
        description={errorAlertMessage}
      />
    </section>
  );
}
