"use client";

import { EmployeeScheduleFields } from "@/components/employee-schedule-fields";
import { employeeScheduleRules, legacyScheduleRules, type ScheduleRule } from "@/lib/employee-schedule";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ManagerLoadingMessage from "../../../manager-loading-message";
import AlertModal from "@/components/modals/alert-modal";
import ProcessingModal from "@/components/modals/processing-modal";

type Bootstrap = {
  employees: { id: string; name: string; is_retired: boolean; work_style: "0" | "1" | "2"; in_time: string; out_time: number; has_weekend?: boolean; schedule_rules_enabled?: boolean; schedule_rules?: ScheduleRule[] }[];
  worksites: { id: string; name: string }[];
};

type AssignmentResponse = {
  assignment: {
    id: string;
  };
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "배정을 처리하지 못했습니다.");
  }

  return payload as T;
}

function todayDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function defaultEndDate(startDate: string) {
  if (!startDate) return "";
  const [year, month, day] = startDate.split("-").map(Number);
  // Date overflow also handles a February 29 start in a leap year.
  const endDate = new Date(Date.UTC(year + 1, month - 1, day - 1));
  return endDate.toISOString().slice(0, 10);
}

function minutesToElapsedTime(value: number | undefined) {
  if (value === undefined) return "06:00";
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export default function AssignmentNewPage() {
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(() => defaultEndDate(startDate));
  const [inTime, setInTime] = useState("08:00");
  const [outTime, setOutTime] = useState("18:00");
  const [workStyle, setWorkStyle] = useState<"0" | "1" | "2">("0");
  const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>(() => legacyScheduleRules(true));
  const [employeeId, setEmployeeId] = useState("");
  const [data, setData] = useState<Bootstrap>({ employees: [], worksites: [] });
  const [alertMessage, setAlertMessage] = useState("");
  const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const sortedEmployees = data.employees.filter((employee) => !employee.is_retired).sort((left, right) =>
    left.name.localeCompare(right.name, "ko-KR"),
  );

  const selectEmployee = useCallback((id: string, employee?: Bootstrap["employees"][number]) => {
    setEmployeeId(id);
    setWorkStyle(employee?.work_style ?? "0");
    setScheduleRules(employeeScheduleRules(employee ?? { has_weekend: true }));
    setInTime((employee?.in_time ?? "06:00").slice(0, 5));
    setOutTime(minutesToElapsedTime(employee?.out_time));
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadBootstrap() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "기본 데이터를 불러오지 못했습니다.");
        }

        if (!ignore) {
          const employees = payload.employees ?? [];
          setData({
            employees,
            worksites: payload.worksites ?? [],
          });

          const requestedEmployeeId = new URLSearchParams(window.location.search).get("employeeId");
          const requestedEmployee = employees.find((employee: Bootstrap["employees"][number]) =>
            employee.id === requestedEmployeeId && !employee.is_retired,
          );
          if (requestedEmployee) selectEmployee(requestedEmployee.id, requestedEmployee);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "기본 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      ignore = true;
    };
  }, [selectEmployee]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await postJson<AssignmentResponse>("/api/assignments", {
        employeeId: formData.get("employeeId"),
        worksiteId: formData.get("worksiteId"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        work_style: workStyle,
        has_weekend: false,
        schedule_rules: scheduleRules,
        in_time: inTime,
        out_time: outTime,
      });

      setCreatedAssignmentId(result.assignment.id);
      setAlertMessage("자료를 저장하였습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "배정을 처리하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">배정등록</h1>
        <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground mt-2 max-w-[37.5rem]">
          근무자에게 근무지를 배정합니다.
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(22.5rem,2fr)]" data-testid="assignment-primary-row">
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-employee">
                  근무자
                </label>
                <NativeSelect className="w-full appearance-none" id="assignment-employee" name="employeeId" value={employeeId} onChange={(event) => {
                  const id = event.target.value;
                  const employee = data.employees.find((item) => item.id === id);
                  selectEmployee(id, employee);
                }} required>
                  <NativeSelectOption value="">선택</NativeSelectOption>
                  {sortedEmployees.map((employee) => (
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
                <NativeSelect className="w-full appearance-none" id="assignment-worksite" name="worksiteId" required>
                  <NativeSelectOption value="">선택</NativeSelectOption>
                  {data.worksites.map((worksite) => (
                    <NativeSelectOption key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 lg:min-w-[22.5rem]">
                <p className="text-[0.875rem] font-semibold text-muted-foreground ml-1">근무기간</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="sr-only" htmlFor="assignment-start-date">
                    시작일
                  </label>
                  <Input
                    aria-label="시작일"
                    className="w-full"
                    id="assignment-start-date"
                    name="startDate"
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      const nextStartDate = event.target.value;
                      setStartDate(nextStartDate);
                      setEndDate(defaultEndDate(nextStartDate));
                    }}
                    required
                  />
                  <label className="sr-only" htmlFor="assignment-end-date">
                    종료일
                  </label>
                  <Input
                    aria-label="종료일"
                    className="w-full"
                    id="assignment-end-date"
                    name="endDate"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3" data-testid="assignment-schedule-row">
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-work-style">근무형태</label>
                <NativeSelect className="w-full appearance-none" id="assignment-work-style" value={workStyle} onChange={(event) => {
                  const nextWorkStyle = event.target.value as "0" | "1" | "2";
                  setWorkStyle(nextWorkStyle);
                  if (nextWorkStyle === "1") {
                    setInTime("06:00");
                    setOutTime("30:00");
                  } else if (nextWorkStyle === "2") {
                    setInTime("22:00");
                    setOutTime("30:00");
                  } else {
                    setInTime("08:00");
                    setOutTime("18:00");
                  }
                }} required>
                  <NativeSelectOption value="0">일반근무</NativeSelectOption>
                  <NativeSelectOption value="1">격일근무</NativeSelectOption>
                  <NativeSelectOption value="2">야간근무</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-in-time">출근</label>
                <Input className="w-full" id="assignment-in-time" aria-label="출근" type="time" value={inTime} onChange={(event) => setInTime(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-out-time">퇴근</label>
                <Input className="w-full" id="assignment-out-time" aria-label="퇴근" type="text" inputMode="numeric" pattern={workStyle === "0" ? "([01]\\d|2[0-3]):[0-5]\\d" : "([01]\\d|2[0-3]):[0-5]\\d|([2-4]\\d):[0-5]\\d"} value={outTime} onChange={(event) => setOutTime(event.target.value)} required />
                <p className="text-xs text-muted-foreground">{workStyle === "0" ? "퇴근 시각을 입력하세요. 예: 18:00" : "출근일 기준 경과 시간으로 입력합니다. 다음 날 오전 6시는 30:00으로 입력하세요."}</p>
              </div>
            </div>

            <EmployeeScheduleFields key={employeeId} rules={scheduleRules} onChange={setScheduleRules} inTime={inTime} outTime={outTime} workStyle={workStyle} />

            <div className="flex flex-wrap gap-3">
              <Button
                aria-label="배정등록"
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                data-testid="assignment-submit"
                disabled={saving}
                type="submit"
              >
                배정등록
              </Button>
              <Button
                aria-label="목록"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:ml-auto w-full md:w-auto"
                type="button"
                onClick={() => router.push("/manager/employee/assignments")}
                variant="outline"
              >
                목록
              </Button>
            </div>
          </form>
        )}

        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      <ProcessingModal isOpen={saving} message="저장처리중입니다..." />

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => {
          setAlertMessage("");
          router.push(createdAssignmentId
            ? `/manager/employee/assignments/save/${createdAssignmentId}`
            : "/manager/employee/assignments");
        }}
        title="알림"
        description={alertMessage}
      />
    </section>
  );
}
