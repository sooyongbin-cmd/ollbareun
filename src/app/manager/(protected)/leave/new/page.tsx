"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SaveIcon } from "@/components/icons/save-icon";
import { CancelIcon } from "@/components/icons/cancel-icon";
import AlertModal from "@/components/modals/alert-modal";
import ManagerLoadingMessage from "../../manager-loading-message";

type Employee = {
  id: string;
  name: string;
  is_retired?: boolean;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "휴가 자료를 처리하지 못했습니다.");
  }
  return payload as T;
}

function todayDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export default function LeaveNewPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [leaveType, setLeaveType] = useState<"1" | "2">("1");
  const [startDate, setStartDate] = useState(todayDate);
  const [endDate, setEndDate] = useState(todayDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadEmployees() {
      try {
        const payload = await fetchJson<{ employees: Employee[] }>("/api/bootstrap");
        if (!ignore) {
          setEmployees((payload.employees ?? []).filter((employee) => !employee.is_retired));
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "직원 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadEmployees();
    return () => {
      ignore = true;
    };
  }, []);

  function handleEmployeeNameChange(nextName: string) {
    setEmployeeName(nextName);
    setEmployeeId(employees.find((employee) => employee.name === nextName)?.id ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await fetchJson<{ leave: { id: string } }>("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, leaveType, startDate, endDate }),
      });
      setSuccessMessage("휴가가 신청되었습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "휴가를 신청하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">휴가신청</h1>
          <p className="max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            직원의 휴가종류와 휴가기간을 입력해 신청합니다.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-employee">
                  이름
                </label>
                <Input
                  id="leave-employee"
                  list="leave-employee-options"
                  value={employeeName}
                  onChange={(event) => handleEmployeeNameChange(event.target.value)}
                  placeholder="이름을 입력하거나 선택하세요."
                  required
                />
                <datalist id="leave-employee-options">
                  {employees.map((employee) => <option key={employee.id} value={employee.name} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-type">
                  휴가종류
                </label>
                <NativeSelect id="leave-type" value={leaveType} onChange={(event) => setLeaveType(event.target.value as "1" | "2")} required>
                  <NativeSelectOption value="1">월차</NativeSelectOption>
                  <NativeSelectOption value="2">연차</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-start-date">
                  시작일
                </label>
                <Input id="leave-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-end-date">
                  종료일
                </label>
                <Input id="leave-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
              </div>
            </div>

            <div className="flex gap-3">
              <Button aria-label="저장" type="submit" disabled={saving}>
                <SaveIcon size={20} />
              </Button>
              <Link aria-label="목록" href="/manager/leave" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50">
                <CancelIcon size={20} />
                <span>목록</span>
              </Link>
            </div>
          </form>
        )}
        {error ? <p role="alert" className="mt-6 text-[1rem] text-destructive">{error}</p> : null}
      </section>

      <AlertModal
        isOpen={Boolean(successMessage)}
        onClose={() => {
          setSuccessMessage("");
          router.push("/manager/leave");
        }}
        title="알림"
        description={successMessage}
      />
    </section>
  );
}
