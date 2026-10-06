"use client";

import { scheduleSummary, type ScheduleRule } from "@/lib/employee-schedule";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import ProcessingModal from "@/components/modals/processing-modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AssignmentAttendanceCalendar, { type DailyAttendance } from "./assignment-attendance-calendar";

type Assignment = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
  in_time?: string;
  has_weekend?: boolean;
  schedule_rules_enabled?: boolean;
  schedule_rules?: ScheduleRule[];
};

type Employee = {
  id: string;
  name: string;
};

type Worksite = {
  id: string;
  name: string;
};

type AttendanceHistory = {
  id: string;
  work_date: string;
  intime_status: "0" | "1" | "2" | "3" | null;
  work_intime: string | null;
};

type AttendanceHistoryResponse = {
  attendances: AttendanceHistory[];
};

const attendanceStatusLabels: Record<NonNullable<AttendanceHistory["intime_status"]>, string> = {
  "0": "결근",
  "1": "지각",
  "2": "출근",
  "3": "휴가",
};

type AssignmentResponse = {
  assignment: Assignment;
};

type HolidayResponse = {
  holidays: { holiday_date: string; selected: string }[];
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
  const [savedSchedule, setSavedSchedule] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [worksiteId, setWorksiteId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [savedStartDate, setSavedStartDate] = useState("");
  const [savedEndDate, setSavedEndDate] = useState("");
  const [currentMonth, setCurrentMonth] = useState("");
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistory[]>([]);
  const [attendanceHistoryLoading, setAttendanceHistoryLoading] = useState(Boolean(assignmentId));
  const [attendanceHistoryError, setAttendanceHistoryError] = useState("");
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(Boolean(assignmentId));
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [errorAlertMessage, setErrorAlertMessage] = useState("");
  const [errorAlertTitle, setErrorAlertTitle] = useState("저장 오류");
  const [alertMessage, setAlertMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [assignmentPayload, bootstrapPayload, dailyAttendancePayload] = await Promise.all([
          fetchJson<AssignmentResponse>(`/api/assignments/${assignmentId}`),
          fetchJson<Bootstrap>("/api/bootstrap"),
          fetchJson<{ dailyAttendance: DailyAttendance[] }>(`/api/manager/assignments/${assignmentId}/daily-attendance`),
        ]);

        const assignment = assignmentPayload.assignment;
        const firstYear = Number(assignment.start_date.slice(0, 4));
        const lastYear = Number(assignment.end_date.slice(0, 4));
        const holidayPayloads = await Promise.all(
          Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index)
            .map((year) => fetchJson<HolidayResponse>(`/api/manager/holidays?year=${year}`)),
        );

        if (!ignore) {
          setDailyAttendance(dailyAttendancePayload.dailyAttendance ?? []);
          setSavedSchedule(scheduleSummary(assignment));
          setEmployeeId(assignment.employee_id);
          setWorksiteId(assignment.worksite_id);
          setStartDate(assignment.start_date);
          setEndDate(assignment.end_date);
          setSavedStartDate(assignment.start_date);
          setSavedEndDate(assignment.end_date);
          setCurrentMonth(assignment.start_date.slice(0, 7));
          setHolidays(new Set(holidayPayloads.flatMap((payload) =>
            (payload.holidays ?? []).filter((holiday) => holiday.selected === "Y").map((holiday) => holiday.holiday_date),
          )));
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

  useEffect(() => {
    let ignore = false;

    async function loadAttendanceHistory() {
      try {
        const payload = await fetchJson<AttendanceHistoryResponse>(
          `/api/manager/assignments/${assignmentId}/attendance-history`,
        );
        if (!ignore) {
          setAttendanceHistory(payload.attendances ?? []);
        }
      } catch (historyError) {
        if (!ignore) {
          setAttendanceHistoryError(historyError instanceof Error ? historyError.message : "출근 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setAttendanceHistoryLoading(false);
        }
      }
    }

    if (!assignmentId) {
      return () => {
        ignore = true;
      };
    }

    void loadAttendanceHistory();

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
      setErrorAlertTitle("저장 오류");
      setErrorAlertMessage(submitError instanceof Error ? submitError.message : "자료를 저장하지 못했습니다.");
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
      setErrorAlertTitle("삭제 오류");
      setErrorAlertMessage(deleteError instanceof Error ? deleteError.message : "자료를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  const employeeName = employees.find((employee) => employee.id === employeeId)?.name ?? "";
  const hasAttendance = attendanceHistory.length > 0;

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
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(22.5rem,2fr)] lg:items-end">
              <div className="flex flex-col gap-2">
                <label className="block leading-5 text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-employee">
                  직원
                </label>
                <Input
                  className="w-full appearance-none"
                  id="assignment-employee"
                  readOnly
                  required
                  aria-label="직원"
                  value={employeeName}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="block leading-5 text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-worksite">
                  근무지
                </label>
                <NativeSelect
                  className="w-full appearance-none"
                  id="assignment-worksite"
                  value={worksiteId}
                  onChange={(event) => setWorksiteId(event.target.value)}
                  disabled={attendanceHistoryLoading || Boolean(attendanceHistoryError) || hasAttendance}
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
              <div className="flex flex-col gap-2 lg:min-w-[22.5rem]">
                <p className="leading-5 text-[0.875rem] font-semibold text-muted-foreground ml-1">근무기간</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="sr-only" htmlFor="assignment-start-date">
                    시작일
                  </label>
                  <Input
                    aria-label="시작일"
                    className="w-full"
                    id="assignment-start-date"
                    type="date"
                    value={startDate}
                    readOnly
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

            <div className="space-y-3">
              {savedSchedule ? (
                <p className="text-center text-sm text-muted-foreground">
                  배정 당시 출근시간: {savedSchedule}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="w-full md:w-auto"
                  type="submit"
                  disabled={saving || deleting}
                >
                  저장
                </Button>
                <Button
                  aria-label="삭제"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                  type="button"
                  disabled={saving || deleting || attendanceHistoryLoading || Boolean(attendanceHistoryError) || hasAttendance}
                  onClick={() => setDeleteConfirmOpen(true)}
                  variant="outline"
                >
                  삭제
                </Button>
                <Button
                  aria-label="목록"
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:ml-auto w-full md:w-auto"
                  type="button"
                  disabled={saving || deleting}
                  onClick={() => router.push("/manager/employee/assignments")}
                  variant="outline"
                >
                  목록
                </Button>
              </div>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[1rem] text-destructive">{error}</p> : null}

        {!loading && savedStartDate && savedEndDate && currentMonth ? (
          <AssignmentAttendanceCalendar
            dailyAttendance={dailyAttendance}
            currentMonth={currentMonth}
            holidays={holidays}
            endDate={savedEndDate}
            onMonthChange={setCurrentMonth}
            startDate={savedStartDate}
          />
        ) : null}
      </section>

      {!loading && savedStartDate && savedEndDate ? (
        <section className="space-y-4 rounded-xl border border-border/50 bg-muted/40 p-6">
          <h2 className="text-xl font-semibold">출근목록</h2>
          {attendanceHistoryLoading ? (
            <ManagerLoadingMessage />
          ) : attendanceHistoryError ? (
            <p className="text-sm text-destructive">{attendanceHistoryError}</p>
          ) : attendanceHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">배정기간 내 출근 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>출근날짜</TableHead>
                    <TableHead>출근상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.map((attendance) => (
                    <TableRow key={attendance.id}>
                      <TableCell>{attendance.work_date}</TableCell>
                      <TableCell>
                        {attendance.intime_status ? attendanceStatusLabels[attendance.intime_status] : "출근"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="자료를 삭제하시겠습니까?"
        description="삭제하면 현재 배정 자료가 완전히 제거됩니다."
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
        title={errorAlertTitle}
        description={errorAlertMessage}
      />
    </section>
  );
}
