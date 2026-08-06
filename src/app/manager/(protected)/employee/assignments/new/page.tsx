"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ManagerLoadingMessage from "../../../manager-loading-message";
import { SaveIcon } from "@/components/icons/save-icon";
import AlertModal from "@/components/modals/alert-modal";

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
  const [alertMessage, setAlertMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
      } finally {
        if (!ignore) {
          setLoading(false);
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
    const formData = new FormData(form);

    try {
      await postJson<AssignmentResponse>("/api/assignments", {
        employeeId: formData.get("employeeId"),
        worksiteId: formData.get("worksiteId"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
      });

      setAlertMessage("자료를 저장하였습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "배정을 처리하지 못했습니다.");
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">배정등록</h1>
        <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground mt-2 max-w-[37.5rem]">
          직원에게 근무지를 배정합니다.
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 lg:grid-cols-[minmax(22.5rem,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2 lg:min-w-[22.5rem]">
                <p className="text-[0.875rem] font-semibold text-muted-foreground ml-1">근무기간</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="sr-only" htmlFor="assignment-start-date">
                    시작일
                  </label>
                  <Input
                    aria-label="시작일"
                    className="w-full"
                    id="assignment-start-date"
                    name="startDate"
                    type="date"
                    defaultValue={todayDate()}
                    required
                  />
                  <label className="sr-only" htmlFor="assignment-end-date">
                    종료일
                  </label>
                  <Input
                    aria-label="종료일"
                    className="w-full"
                    id="assignment-end-date"
                    name="endDate"
                    type="date"
                    defaultValue={todayDate()}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-worksite">
                  근무지
                </label>
                <NativeSelect className="w-full appearance-none" id="assignment-worksite" name="worksiteId" required>
                  <NativeSelectOption value="">선택</NativeSelectOption>
                  {data.worksites.map((worksite) => (
                    <NativeSelectOption key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-employee">
                  직원
                </label>
                <NativeSelect className="w-full appearance-none" id="assignment-employee" name="employeeId" required>
                  <NativeSelectOption value="">선택</NativeSelectOption>
                  {data.employees.map((employee) => (
                    <NativeSelectOption key={employee.id} value={employee.id}>
                      {employee.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <Button
              aria-label="저장"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
              data-testid="assignment-submit"
              type="submit"
            >
              <SaveIcon size={20} />
            </Button>
          </form>
        )}

        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => {
          setAlertMessage("");
          router.push("/manager/employee/assignments");
        }}
        title="알림"
        description={alertMessage}
      />
    </section>
  );
}
