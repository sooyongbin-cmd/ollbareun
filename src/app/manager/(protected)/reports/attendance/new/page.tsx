"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveIcon } from "@/components/icons/save-icon";
import { CancelIcon } from "@/components/icons/cancel-icon";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import ManagerLoadingMessage from "../../../manager-loading-message";

type Option = { id: string; name: string };
type Assignment = { employee_id: string; worksite_id: string };

function sortOptions(options: Option[]) {
  return [...options].sort((left, right) => left.name.localeCompare(right.name, "ko-KR"));
}

export default function AttendanceNewPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Option[]>([]);
  const [worksites, setWorksites] = useState<Option[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [worksiteId, setWorksiteId] = useState("");
  const [worksiteName, setWorksiteName] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
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
          setEmployees(sortOptions(data.employees ?? []));
          setWorksites(sortOptions(data.worksites ?? []));
          setAssignments(data.assignments ?? []);
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

  function handleEmployeeNameChange(nextName: string) {
    setEmployeeName(nextName);
    setError("");

    const employee = employees.find((option) => option.name === nextName);
    if (!employee) {
      setEmployeeId("");
      setWorksiteId("");
      setWorksiteName("");
      return;
    }

    setEmployeeId(employee.id);
    const assignment = assignments.find((item) => item.employee_id === employee.id);
    if (!assignment) {
      setWorksiteId("");
      setWorksiteName("");
      setError(`직원(${employee.name})의 오늘 배정된 근무지가 없습니다.`);
      return;
    }

    setWorksiteId(assignment.worksite_id);
    setWorksiteName(worksites.find((option) => option.id === assignment.worksite_id)?.name ?? "");
  }

  function handleWorksiteNameChange(nextName: string) {
    setWorksiteName(nextName);
    setWorksiteId(worksites.find((option) => option.name === nextName)?.id ?? "");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employeeId) {
      setError("직원을 선택하세요.");
      return;
    }
    const employee = employees.find((option) => option.id === employeeId);
    const hasTodayAssignment = assignments.some((item) => item.employee_id === employeeId);
    if (employee && !hasTodayAssignment) {
      setError(`직원(${employee.name})의 오늘 배정된 근무지가 없습니다.`);
      return;
    }
    if (!worksiteId) {
      setError("근무지를 선택하세요.");
      return;
    }
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
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground" htmlFor="employee-id">직원이름</label>
                <Input
                  id="employee-id"
                  className="w-full"
                  list="attendance-employee-options"
                  value={employeeName}
                  onChange={(event) => handleEmployeeNameChange(event.target.value)}
                  placeholder="직원이름을 입력하거나 선택하세요"
                  required
                />
                <datalist id="attendance-employee-options">
                  {employees.map((employee) => <option key={employee.id} value={employee.name} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground" htmlFor="worksite-id">근무지</label>
                <Input
                  id="worksite-id"
                  className="w-full"
                  list="attendance-worksite-options"
                  value={worksiteName}
                  onChange={(event) => handleWorksiteNameChange(event.target.value)}
                  placeholder="근무지를 입력하거나 선택하세요"
                  required
                />
                <datalist id="attendance-worksite-options">
                  {worksites.map((worksite) => <option key={worksite.id} value={worksite.name} />)}
                </datalist>
              </div>
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
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSave}
        title="출근 기록을 등록하시겠습니까?"
        loading={saving}
        loadingLabel="저장처리중입니다..."
      />
      <AlertModal isOpen={successOpen} onClose={() => router.push("/manager/reports/attendance")} title="알림" description="등록이 완료되었습니다." />
    </section>
  );
}
