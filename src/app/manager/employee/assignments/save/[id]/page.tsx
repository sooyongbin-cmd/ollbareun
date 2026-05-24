"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import ManagerLoadingMessage from "../../../../manager-loading-message";

type Assignment = {
  id: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
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
  const [workDate, setWorkDate] = useState("");
  const [loading, setLoading] = useState(Boolean(assignmentId));
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [assignmentPayload, bootstrapPayload] = await Promise.all([
          fetchJson<AssignmentResponse>(`/api/assignments/${assignmentId}`),
          fetchJson<Bootstrap>("/api/bootstrap"),
        ]);

        if (!ignore) {
          setEmployeeId(assignmentPayload.assignment.employee_id);
          setWorksiteId(assignmentPayload.assignment.worksite_id);
          setWorkDate(assignmentPayload.assignment.work_date);
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
    setError("");

    try {
      await fetchJson<AssignmentResponse>(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          worksiteId,
          workDate,
        }),
      });

      window.alert("자료가 저장되었습니다.");
      router.push("/manager/employee/assignments");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "자료를 저장하지 못했습니다.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      await deleteRequest(`/api/assignments/${assignmentId}`);
      window.alert("자료가 삭제되었습니다.");
      router.push("/manager/employee/assignments");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "자료를 삭제하지 못했습니다.");
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
          <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">배정수정</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            선택한 배정의 직원, 근무지, 날짜를 수정합니다.
          </p>
        </div>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="text-[16px] text-status-warn">{error}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-employee">
                  직원
                </label>
                <select
                  className="field appearance-none"
                  id="assignment-employee"
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                  required
                >
                  <option value="">선택</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-worksite">
                  근무지
                </label>
                <select
                  className="field appearance-none"
                  id="assignment-worksite"
                  value={worksiteId}
                  onChange={(event) => setWorksiteId(event.target.value)}
                  required
                >
                  <option value="">선택</option>
                  {worksites.map((worksite) => (
                    <option key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-date">
                  근무일
                </label>
                <input
                  className="field"
                  id="assignment-date"
                  type="date"
                  value={workDate}
                  onChange={(event) => setWorkDate(event.target.value)}
                  required
                />
              </div>
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
            <h2 className="text-[24px] font-semibold">자료를 삭제하시겠습니까?</h2>
            <p className="mt-3 text-[16px] text-ink-muted-48">
              삭제하면 현재 배정 자료가 완전히 제거됩니다.
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
