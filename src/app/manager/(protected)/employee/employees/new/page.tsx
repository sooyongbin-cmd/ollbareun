"use client";

import { EmployeeScheduleFields } from "@/components/employee-schedule-fields";
import { legacyScheduleRules, type ScheduleRule } from "@/lib/employee-schedule";
import { fetchEmployeeRoles } from "@/lib/employee-roles";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { SaveIcon } from "@/components/icons/save-icon";
import AlertModal from "@/components/modals/alert-modal";
import ProcessingModal from "@/components/modals/processing-modal";

type EmployeeResponse = {
  employee: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
};

type Period = "오전" | "오후";
type ShiftDay = "당일" | "익일";

const hours = Array.from({ length: 12 }, (_, hour) => String(hour).padStart(2, "0"));

function formatClockTime(period: Period, hour: string) {
  return `${String(Number(hour) + (period === "오후" ? 12 : 0)).padStart(2, "0")}:00`;
}

function formatPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone;
}

function formatOutTime(day: ShiftDay, period: Period, hour: string) {
  const dayOffset = day === "익일" ? 24 : 0;
  return `${String(Number(hour) + (period === "오후" ? 12 : 0) + dayOffset).padStart(2, "0")}:00`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  }

  return payload as T;
}

export default function EmployeeNewPage() {
  const [phone, setPhone] = useState("");
  const [employeeRoles, setEmployeeRoles] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [workStyle, setWorkStyle] = useState("0");
  const [inPeriod, setInPeriod] = useState<Period>("오전");
  const [inHour, setInHour] = useState("08");
  const [outDay, setOutDay] = useState<ShiftDay>("당일");
  const [outPeriod, setOutPeriod] = useState<Period>("오후");
  const [outHour, setOutHour] = useState("06");
  const inTime = formatClockTime(inPeriod, inHour);
  const outTime = formatOutTime(outDay, outPeriod, outHour);
  const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>(() => legacyScheduleRules(true));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(null);
  const router = useRouter();

  function changeWorkStyle(nextWorkStyle: string) {
    setWorkStyle(nextWorkStyle);
    setInPeriod(nextWorkStyle === "2" ? "오후" : "오전");
    setInHour(nextWorkStyle === "0" ? "08" : nextWorkStyle === "2" ? "10" : "06");
    setOutDay(nextWorkStyle === "0" ? "당일" : "익일");
    setOutPeriod(nextWorkStyle === "0" ? "오후" : "오전");
    setOutHour("06");
  }

  useEffect(() => {
    let ignore = false;

    fetchEmployeeRoles()
      .then((roles) => {
        if (!ignore) {
          setEmployeeRoles(roles);
          setRole(roles[0] ?? "");
        }
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError instanceof Error ? loadError.message : "직군 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!ignore) setLoadingRoles(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const result = await postJson<EmployeeResponse>("/api/employees", {
        name: data.get("name"),
        phone: phone.replace(/\D/g, ""),
        role,
        work_style: workStyle,
        in_time: inTime,
        out_time: outTime,
        has_weekend: false,
        schedule_rules: scheduleRules,
      });

      setCreatedEmployeeId(result.employee.id);
      setSuccessMessage(`직원이름(${result.employee.name}) 연락처(${formatPhoneNumber(result.employee.phone)}) 직군(${result.employee.role}) 등록완료`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청을 처리하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">직원등록</h1>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid gap-4 min-[768px]:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-name">
                직원이름
              </label>
              <Input className="w-full" id="employee-name" name="name" placeholder="직원 이름을 입력하세요." required />
            </div>
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-phone">
                연락처
              </label>
              <Input
                className="w-full"
                id="employee-phone"
                name="phone"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
                  const formatted = digits.length > 7
                    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
                    : digits.length > 3
                      ? `${digits.slice(0, 3)}-${digits.slice(3)}`
                      : digits;
                  setPhone(formatted);
                }}
                required
              />
            </div>
            </div>
            <div className="grid gap-4 min-[768px]:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-role">
                직군
              </label>
              <NativeSelect
                className="w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] bg-no-repeat pr-10"
                id="employee-role"
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={loadingRoles}
                required
              >
                {loadingRoles ? <NativeSelectOption value="">불러오는 중...</NativeSelectOption> : null}
                {employeeRoles.map((employeeRole) => (
                  <NativeSelectOption key={employeeRole} value={employeeRole}>{employeeRole}</NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <label htmlFor="employee-work-style" className="text-sm font-semibold text-muted-foreground">근무형태</label>
              <NativeSelect id="employee-work-style" value={workStyle} onChange={(event) => changeWorkStyle(event.target.value)} required>
                <NativeSelectOption value="0">일반근무</NativeSelectOption>
                <NativeSelectOption value="1">격일근무</NativeSelectOption>
                <NativeSelectOption value="2">야간근무</NativeSelectOption>
              </NativeSelect>
            </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="employee-in-time" className="text-sm font-semibold text-muted-foreground">출근</label>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1">
                  <NativeSelect aria-label="출근 오전/오후" value={inPeriod} onChange={(event) => setInPeriod(event.target.value as Period)}>
                    <NativeSelectOption value="오전">오전</NativeSelectOption>
                    <NativeSelectOption value="오후">오후</NativeSelectOption>
                  </NativeSelect>
                  <NativeSelect id="employee-in-time" aria-label="출근 시각" value={inHour} onChange={(event) => setInHour(event.target.value)} required>
                    {hours.map((hour) => <NativeSelectOption key={hour} value={hour}>{hour}시</NativeSelectOption>)}
                  </NativeSelect>
                  <output className="min-w-[3.5rem] text-right text-sm tabular-nums" aria-live="polite">{inTime}</output>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="employee-out-day" className="text-sm font-semibold text-muted-foreground">퇴근</label>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1">
                  <NativeSelect id="employee-out-day" aria-label="퇴근일" value={outDay} onChange={(event) => setOutDay(event.target.value as ShiftDay)}>
                    <NativeSelectOption value="당일">당일</NativeSelectOption>
                    <NativeSelectOption value="익일" disabled={workStyle === "0"}>익일</NativeSelectOption>
                  </NativeSelect>
                  <NativeSelect aria-label="퇴근 오전/오후" value={outPeriod} onChange={(event) => setOutPeriod(event.target.value as Period)}>
                    <NativeSelectOption value="오전">오전</NativeSelectOption>
                    <NativeSelectOption value="오후">오후</NativeSelectOption>
                  </NativeSelect>
                  <NativeSelect aria-label="퇴근 시각" value={outHour} onChange={(event) => setOutHour(event.target.value)}>
                    {hours.map((hour) => <NativeSelectOption key={hour} value={hour}>{hour}시</NativeSelectOption>)}
                  </NativeSelect>
                  <output className="min-w-[3.5rem] text-right text-sm tabular-nums" aria-live="polite">{outTime}</output>
                </div>
              </div>
            </div>
          </div>

          <EmployeeScheduleFields rules={scheduleRules} onChange={setScheduleRules} inTime={inTime} outTime={outTime} workStyle={workStyle} />

          <div className="flex flex-wrap gap-3">
            <Button
              aria-label="저장"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
              data-testid="employee-submit"
              disabled={saving || loadingRoles || !role}
              type="submit"
            >
              <SaveIcon size={20} />
            </Button>
            <Button
              aria-label="목록"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:ml-auto w-full md:w-auto"
              type="button"
              onClick={() => router.push("/manager/employee/employees")}
              variant="outline"
            >
              목록
            </Button>
          </div>
        </form>

        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      <ProcessingModal isOpen={saving} message="저장처리중입니다..." />

      <AlertModal
        isOpen={Boolean(successMessage)}
        onClose={() => {
          setSuccessMessage("");
          router.push("/manager/employee/employees");
        }}
        secondaryButtonLabel={createdEmployeeId ? "배정등록" : undefined}
        onSecondaryButtonClick={createdEmployeeId ? () => {
          setSuccessMessage("");
          router.push(`/manager/employee/assignments/new?employeeId=${encodeURIComponent(createdEmployeeId)}`);
        } : undefined}
        title="알림"
        description={successMessage}
      />
    </section>
  );
}
