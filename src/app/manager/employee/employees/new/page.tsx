"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type EmployeeResponse = {
  employee: {
    id: string;
    name: string;
    phone: string;
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
    throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  }

  return payload as T;
}

export default function EmployeeNewPage() {
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const result = await postJson<EmployeeResponse>("/api/employees", {
        name: data.get("name"),
        phone: data.get("phone"),
      });

      window.alert(`직원이름(${result.employee.name}) 연락처(${result.employee.phone}) 등록완료`);
      form.reset();
      router.push("/manager/employee/employees");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청을 처리하지 못했습니다.");
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">직원등록</h1>
        <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[600px]">
          직원 이름과 연락처를 입력해 등록합니다.
        </p>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-name">
                직원이름
              </label>
              <input className="field" id="employee-name" name="name" placeholder="직원 이름을 입력하세요." required />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-phone">
                연락처
              </label>
              <input className="field" id="employee-phone" name="phone" placeholder="010-0000-0000" required />
            </div>
          </div>

          <button className="button-primary w-full md:w-auto" data-testid="employee-submit" type="submit">
            직원 등록
          </button>
        </form>

        {error ? <p className="status-warn mt-6 text-center">{error}</p> : null}
      </section>
    </section>
  );
}
