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
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";

type Employee = {
  id: string;
  name: string;
  phone: string;
  is_retired: boolean;
  role: "경비원" | "미화원" | "파견";
};

type EmployeeResponse = {
  employee: Employee;
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

export default function EmployeeSavePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const employeeId = params.id;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"경비원" | "미화원" | "파견">("경비원");
  const [isRetired, setIsRetired] = useState(false);
  const [loading, setLoading] = useState(Boolean(employeeId));
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const routeError = employeeId ? error : "직원 정보를 불러오지 못했습니다.";

  useEffect(() => {
    let ignore = false;

    async function loadEmployee() {
      try {
        const data = await fetchJson<EmployeeResponse>(`/api/employees/${employeeId}`);
        if (!ignore) {
          setName(data.employee.name);
          setPhone(data.employee.phone);
          setRole(data.employee.role);
          setIsRetired(data.employee.is_retired);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "직원 정보를 불러오지 못했습니다.");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await fetchJson<EmployeeResponse>(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, role, is_retired: isRetired }),
      });

      setSaveSuccessOpen(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "직원 정보를 저장하지 못했습니다.");
    }
  }

  async function handleDelete() {
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

  return (
    <section className="space-y-[24px]">
      <header>
        <p className="text-[14px] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[28px] leading-[1.2]">직원수정</h1>
          <p className="text-[14px] font-normal leading-relaxed text-muted-foreground max-w-[640px]">
            선택한 직원의 이름과 연락처를 수정할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p className="text-[16px] text-destructive">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="employee-name">
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
                <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="employee-phone">
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
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="employee-role">
                  역할
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
              <label className="flex items-center gap-3 text-[14px] font-semibold text-muted-foreground ml-1">
                <Checkbox
                  checked={isRetired}
                  onCheckedChange={(checked) => setIsRetired(checked === true)}
                />
                퇴직
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button aria-label="저장" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full md:w-auto" type="submit">
                <SaveIcon size={20} />
              </Button>
              <Button
                aria-label="삭제"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full md:w-auto"
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                variant="outline"
              >
                <DeleteIcon size={20} />
              </Button>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[16px] text-destructive">{error}</p> : null}
      </section>

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
