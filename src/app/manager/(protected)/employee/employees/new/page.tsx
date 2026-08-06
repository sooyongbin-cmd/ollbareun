"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SaveIcon } from "@/components/icons/save-icon";
import AlertModal from "@/components/modals/alert-modal";

type EmployeeResponse = {
  employee: {
    id: string;
    name: string;
    phone: string;
    role: string;
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
  const [successMessage, setSuccessMessage] = useState("");
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
        role: data.get("role"),
      });

      setSuccessMessage(`직원이름(${result.employee.name}) 연락처(${result.employee.phone}) 역할(${result.employee.role}) 등록완료`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청을 처리하지 못했습니다.");
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">직원등록</h1>
        <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground mt-2 max-w-[37.5rem]">
          직원 이름과 연락처를 입력해 등록합니다.
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
              <Input className="w-full" id="employee-phone" name="phone" placeholder="010-0000-0000" required />
            </div>
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-role">
                역할
              </label>
              <NativeSelect
                className="w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] bg-no-repeat pr-10"
                id="employee-role"
                name="role"
                defaultValue="경비원"
                required
              >
                <NativeSelectOption value="경비원">경비원</NativeSelectOption>
                <NativeSelectOption value="미화원">미화원</NativeSelectOption>
                <NativeSelectOption value="파견">파견</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          <Button
            aria-label="저장"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
            data-testid="employee-submit"
            type="submit"
          >
            <SaveIcon size={20} />
          </Button>
        </form>

        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      <AlertModal
        isOpen={Boolean(successMessage)}
        onClose={() => {
          setSuccessMessage("");
          router.push("/manager/employee/employees");
        }}
        title="알림"
        description={successMessage}
      />
    </section>
  );
}
