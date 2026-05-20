"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Bootstrap = {
  employees: { id: string; name: string }[];
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
  return new Date().toISOString().slice(0, 10);
}

export default function AssignmentNewPage() {
  const [data, setData] = useState<Bootstrap>({ employees: [], worksites: [] });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

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
          setData({
            employees: payload.employees ?? [],
            worksites: payload.worksites ?? [],
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "기본 데이터를 불러오지 못했습니다.");
        }
      }
    }

    void loadBootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      await postJson<AssignmentResponse>("/api/assignments", {
        employeeId: data.get("employeeId"),
        worksiteId: data.get("worksiteId"),
        workDate: data.get("workDate"),
      });

      window.alert("자료를 저장하였습니다.");
      router.push("/manager/employee/assignments");
    } catch (submitError) {
      setMessage("");
      setError(submitError instanceof Error ? submitError.message : "배정을 처리하지 못했습니다.");
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">배정하기</h1>
        <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[600px]">
          직원에게 근무지를 배정합니다.
        </p>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-employee">
                직원
              </label>
              <select className="field appearance-none" id="assignment-employee" name="employeeId" required>
                <option value="">선택</option>
                {data.employees.map((employee) => (
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
              <select className="field appearance-none" id="assignment-worksite" name="worksiteId" required>
                <option value="">선택</option>
                {data.worksites.map((worksite) => (
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
              <input className="field" id="assignment-date" name="workDate" type="date" defaultValue={todayDate()} />
            </div>
          </div>

          <button className="button-primary w-full md:w-auto" data-testid="assignment-submit" type="submit">
            배정하기
          </button>
        </form>

        {message ? <p className="status-ok mt-6 text-center">{message}</p> : null}
        {error ? <p className="status-warn mt-6 text-center">{error}</p> : null}
      </section>
    </section>
  );
}
