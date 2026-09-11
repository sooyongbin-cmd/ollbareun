"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import { SaveIcon } from "@/components/icons/save-icon";
import { DeleteIcon } from "@/components/icons/delete-icon";
import { CancelIcon } from "@/components/icons/cancel-icon";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";

type Employee = {
  id: string;
  name: string;
  phone: string;
  work_style: "0" | "1" | "2";
  in_time: string;
  out_time: string;
  is_retired: boolean;
  role: "경비원" | "미화원" | "파견";
};

type EmployeeResponse = {
  employee: Employee;
  assignments: EmployeeAssignment[];
};

type EmployeeMutationResponse = {
  employee: Employee;
};

type EmployeeAssignment = {
  id: string;
  worksite_name: string;
  start_date: string;
  end_date: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "직원 정보를 불러오지 못했습니다.");
  }

  return payload as T;
}

async function deleteRequest(url: string): Promise<void> {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "직원 정보를 삭제하지 못했습니다.");
  }
}

function formatAssignmentPeriod(assignment: EmployeeAssignment) {
  return assignment.start_date === assignment.end_date
    ? assignment.start_date
    : `${assignment.start_date} ~ ${assignment.end_date}`;
}

export default function EmployeeSavePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const employeeId = params.id;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"경비원" | "미화원" | "파견">("경비원");
  const [workStyle, setWorkStyle] = useState("1");
  const [inTime, setInTime] = useState("06:00");
  const [outTime, setOutTime] = useState("06:00");
  const [isRetired, setIsRetired] = useState(false);
  const [assignments, setAssignments] = useState<EmployeeAssignment[]>([]);
  const [loading, setLoading] = useState(Boolean(employeeId));
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const routeError = employeeId ? loadError : "직원 정보를 불러오지 못했습니다.";

  useEffect(() => {
    let ignore = false;

    async function loadEmployee() {
      try {
        const data = await fetchJson<EmployeeResponse>(`/api/employees/${employeeId}`);
        if (!ignore) {
          setName(data.employee.name);
          setPhone(data.employee.phone);
          setRole(data.employee.role);
          setWorkStyle(data.employee.work_style ?? "1");
          setInTime((data.employee.in_time ?? "06:00").slice(0, 5));
          setOutTime((data.employee.out_time ?? "06:00").slice(0, 5));
          setIsRetired(data.employee.is_retired);
          setAssignments(data.assignments ?? []);
        }
      } catch (loadFailure) {
        if (!ignore) {
          setLoadError(loadFailure instanceof Error ? loadFailure.message : "직원 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (!employeeId) {
      return () => {
        ignore = true;
      };
    }

    void loadEmployee();

    return () => {
      ignore = true;
    };
  }, [employeeId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveConfirmOpen(true);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");

    try {
      await fetchJson<EmployeeMutationResponse>(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, role, is_retired: isRetired, work_style: workStyle, in_time: inTime, out_time: outTime }),
      });

      setSaveSuccessOpen(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "직원 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
      setSaveConfirmOpen(false);
    }
  }

  async function handleDelete() {
    if (assignments.length > 0) {
      setError("해당직원의 근무지배정 정보가 있습니다.");
      setDeleteConfirmOpen(false);
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteRequest(`/api/employees/${employeeId}`);
      router.push("/manager/employee/employees");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "직원 정보를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  function handleDeleteRequest() {
    if (assignments.length > 0) {
      setError("해당직원의 근무지배정 정보가 있습니다.");
      return;
    }

    setDeleteConfirmOpen(true);
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">직원 상세</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            선택한 직원의 이름과 연락처를 수정할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p role="alert" className="text-[1rem] text-destructive">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-name">
                    직원이름
                  </label>
                  <Input
                    className="w-full"
                    id="employee-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-phone">
                    연락처
                  </label>
                  <Input
                    className="w-full"
                    id="employee-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-role">
                    직군
                  </label>
                  <NativeSelect
                    className="w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] bg-no-repeat pr-10"
                    id="employee-role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as "경비원" | "미화원" | "파견")}
                    required
                  >
                    <NativeSelectOption value="경비원">경비원</NativeSelectOption>
                    <NativeSelectOption value="미화원">미화원</NativeSelectOption>
                    <NativeSelectOption value="파견">파견</NativeSelectOption>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <label htmlFor="employee-work-style" className="text-sm font-semibold text-muted-foreground">근무형태</label>
                  <NativeSelect id="employee-work-style" value={workStyle} onChange={(event) => { setWorkStyle(event.target.value); setInTime(event.target.value === "0" ? "08:00" : event.target.value === "2" ? "22:00" : "06:00"); setOutTime(event.target.value === "0" ? "18:00" : "06:00"); }} required>
                    <NativeSelectOption value="0">일반근무</NativeSelectOption>
                    <NativeSelectOption value="1">24시간근무</NativeSelectOption>
                    <NativeSelectOption value="2">야간근무</NativeSelectOption>
                  </NativeSelect>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="employee-in-time" className="text-sm font-semibold text-muted-foreground">출근</label>
                  <Input id="employee-in-time" type="time" value={inTime} onChange={(event) => setInTime(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="employee-out-time" className="text-sm font-semibold text-muted-foreground">퇴근</label>
                  <Input id="employee-out-time" type="time" value={outTime} onChange={(event) => setOutTime(event.target.value)} required />
                </div>
              </div>
              <label className="flex items-center gap-3 text-[0.875rem] font-semibold text-muted-foreground ml-1">
                <Checkbox
                  checked={isRetired}
                  onCheckedChange={(checked) => setIsRetired(checked === true)}
                />
                퇴직
              </label>
            </div>

            <div className="flex gap-3 [&>button]:w-auto">
              <Button aria-label="저장" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto" type="submit">
                <SaveIcon size={20} />
              </Button>
              <Button
                aria-label="삭제"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                type="button"
                onClick={handleDeleteRequest}
                variant="outline"
              >
                <DeleteIcon size={20} />
              </Button>
              <Button
                aria-label="취소"
                title="취소"
                className="min-h-10 px-4 py-2"
                type="button"
                variant="outline"
                onClick={() => router.push("/manager/employee/employees")}
              >
                <CancelIcon size={20} />
              </Button>
            </div>
          </form>
        )}

        {error ? <p role="alert" className="mt-6 text-[1rem] text-destructive">{error}</p> : null}
      </section>

      {!loading && !routeError && assignments.length > 0 ? (
        <section
          aria-label="근무지배정 정보"
          className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
        >
          <div className="space-y-3">
            <h2 className="text-[1.25rem] font-semibold">근무지배정 정보</h2>
            <p className="text-[0.875rem] leading-relaxed text-muted-foreground">
              해당 직원에게 등록된 근무지와 근무기간입니다.
            </p>
          </div>
          <div className="mt-6 space-y-3">
            {assignments.map((assignment) => (
              <dl
                className="grid gap-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2"
                key={assignment.id}
              >
                <div>
                  <dt className="text-[0.8125rem] font-semibold text-muted-foreground">근무지</dt>
                  <dd className="mt-1 font-semibold">{assignment.worksite_name}</dd>
                </div>
                <div>
                  <dt className="text-[0.8125rem] font-semibold text-muted-foreground">근무기간</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{formatAssignmentPeriod(assignment)}</dd>
                </div>
              </dl>
            ))}
          </div>
        </section>
      ) : null}

      <ConfirmModal
        isOpen={saveConfirmOpen}
        onClose={() => setSaveConfirmOpen(false)}
        onConfirm={handleSave}
        title="변경사항을 저장하시겠습니까?"
        loading={saving}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="현재자료를 삭제할까요?"
        description="삭제하면 해당 직원의 자료와 연결된 근무 배정, 출퇴근 기록도 함께 삭제됩니다."
        loading={deleting}
      />

      <AlertModal
        isOpen={saveSuccessOpen}
        onClose={() => {
          setSaveSuccessOpen(false);
          router.push("/manager/employee/employees");
        }}
        title="알림"
        description="수정이 완료되었습니다."
      />
    </section>
  );
}
