"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GpsInfo } from "@/lib/gps";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  is_retired: boolean;
};

type WorksiteRow = {
  id: string;
  name: string;
  gps_info: GpsInfo;
  radius_meters: number;
};

type AssignmentRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  start_date: string;
  end_date: string;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

type GuardSession = {
  employee: EmployeeRow;
  assignment: AssignmentRow | null;
  worksite: WorksiteRow | null;
  attendance: AttendanceRow | null;
};

const guardNameStorageKey = "ollbareun.guard.name";
const guardSessionStorageKey = "ollbareun.guard.session";

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

function readStoredGuardName() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(guardNameStorageKey) ?? "";
  } catch {
    return "";
  }
}

function writeStoredGuardName(name: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(guardNameStorageKey, name);
  } catch {
    // Keep authentication usable when storage is unavailable.
  }
}

function writeStoredGuardSession(session: GuardSession) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(guardSessionStorageKey, JSON.stringify(session));
  } catch {
    // Navigation can still continue; the main page will ask for login again if storage fails.
  }
}

export default function GuardPage() {
  const router = useRouter();
  const [savedGuardName, setSavedGuardName] = useState(readStoredGuardName);

  async function handleGuardAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const session = await postJson<GuardSession>("/api/guard/auth", {
        name: form.get("name"),
        phone: form.get("phone"),
      });

      setSavedGuardName(session.employee.name);
      writeStoredGuardName(session.employee.name);
      writeStoredGuardSession(session);
      router.push("/guard/main");
    } catch (authError) {
      const authMessage = authError instanceof Error ? authError.message : "경비원 인증에 실패했습니다.";
      window.alert(authMessage);
    }
  }

  return (
    <main className="min-h-screen bg-canvas text-ink font-apple selection:bg-primary/20">
      <div className="mx-auto flex min-h-screen w-full max-w-[600px] items-center px-5">
        <form className="w-full space-y-6" onSubmit={handleGuardAuth}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="guard-name">
                경비원 이름
              </label>
              <input
                className="field"
                defaultValue={savedGuardName}
                id="guard-name"
                key={savedGuardName}
                name="name"
                placeholder="이름을 입력하세요."
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="guard-phone">
                경비원 연락처
              </label>
              <input className="field" id="guard-phone" name="phone" placeholder="010-0000-0000" required />
            </div>
          </div>
          <button className="button-primary w-full" data-testid="guard-auth-submit" type="submit">
            로그인
          </button>
        </form>
      </div>
    </main>
  );
}
