"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type Employee = {
  id: string;
  name: string;
  phone: string;
  is_retired: boolean;
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
  const [isRetired, setIsRetired] = useState(false);
  const [loading, setLoading] = useState(Boolean(employeeId));
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
        body: JSON.stringify({ name, phone, is_retired: isRetired }),
      });

      window.alert("수정이 완료되었습니다.");
      router.push("/manager/employee/employees");
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
        <p className="text-[14px] font-semibold text-ink-muted-48 uppercase tracking-wider">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">직원수정</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            선택한 직원의 이름과 연락처를 수정할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        {loading ? (
          <p className="text-[16px] text-ink-muted-48">직원 정보를 불러오는 중입니다.</p>
        ) : routeError ? (
          <p className="text-[16px] text-status-warn">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-name">
                  직원이름
                </label>
                <input
                  className="field"
                  id="employee-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-phone">
                  연락처
                </label>
                <input
                  className="field"
                  id="employee-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </div>
              <label className="flex items-center gap-3 text-[14px] font-semibold text-ink-muted-48 ml-1">
                <input
                  type="checkbox"
                  checked={isRetired}
                  onChange={(event) => setIsRetired(event.target.checked)}
                />
                퇴직
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="button-primary w-full md:w-auto" type="submit">
                저장
              </button>
              <button
                className="button-secondary w-full md:w-auto"
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                삭제
              </button>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[16px] text-status-warn">{error}</p> : null}
      </section>

      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-[420px] rounded-[20px] bg-canvas p-6 shadow-2xl border border-hairline">
            <h2 className="text-[24px] font-semibold">현재자료를 삭제할까요?</h2>
            <p className="mt-3 text-[16px] text-ink-muted-48">
              삭제하면 해당 직원의 자료와 연결된 근무 배정, 출퇴근 기록도 함께 삭제됩니다.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                className="button-primary flex-1"
                type="button"
                onClick={handleDelete}
                disabled={deleting}
              >
                예
              </button>
              <button
                className="button-secondary flex-1"
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
