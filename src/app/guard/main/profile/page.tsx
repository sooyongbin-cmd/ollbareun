"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getSupabasePasskeyClient } from "@/lib/supabase-passkey-client";
import {
  readStoredGuardSessionSnapshot,
  subscribeToGuardSessionChange,
} from "../../guard-session-storage";
import {
  decreaseGuardFontZoomPercent,
  decreaseGuardZoomPercent,
  getGuardFontZoomPercent,
  getGuardZoomPercent,
  increaseGuardFontZoomPercent,
  increaseGuardZoomPercent,
  setGuardFontZoomPercent,
  setGuardZoomPercent,
  subscribeToGuardFontZoomChange,
  subscribeToGuardZoomChange,
} from "../../guard-zoom";
import GuardLogoutButton from "../guard-logout-button";

type GuardSession = {
  employee?: {
    id?: unknown;
    name?: unknown;
  } | null;
};

type ScheduleRow = {
  id: string;
  period: string;
  worksiteName: string;
};

type MonthlyAttendanceRow = {
  yearMonth: string;
  attendanceDays: number;
  workHoursTotal: string;
};

type GuardProfilePayload = {
  schedules: ScheduleRow[];
  monthlyAttendance: MonthlyAttendanceRow[];
};

type PasskeyRequest = {
  id: string;
  status: "pending" | "approved" | "rejected" | "registered" | "revoked";
} | null;

function readGuardEmployeeIdSnapshot() {
  const snapshot = readStoredGuardSessionSnapshot();
  if (!snapshot) return null;

  try {
    const session = JSON.parse(snapshot) as GuardSession;
    return typeof session.employee?.id === "string" && session.employee.id.trim()
      ? session.employee.id.trim()
      : null;
  } catch {
    return null;
  }
}

function ProfileTableShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
      {children}
    </div>
  );
}

function GuardZoomSettingSection({
  title,
  label,
  zoomPercent,
  previousZoomPercent,
  nextZoomPercent,
  decreaseLabel,
  increaseLabel,
  onChange,
}: {
  title: string;
  label: string;
  zoomPercent: number;
  previousZoomPercent: number;
  nextZoomPercent: number;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (zoomPercent: number) => void;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[16px]"
    >
      <h2 className="text-[24px] font-semibold">{title}</h2>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-[12px] bg-surface-black px-4 py-3 text-canvas">
        <span className="text-[16px] font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <button
            aria-label={decreaseLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[24px] leading-none transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={previousZoomPercent === zoomPercent}
            onClick={() => onChange(previousZoomPercent)}
            type="button"
          >
            -
          </button>
          <span className="min-w-[64px] text-center text-[16px] font-semibold">{zoomPercent}%</span>
          <button
            aria-label={increaseLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[24px] leading-none transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={nextZoomPercent === zoomPercent}
            onClick={() => onChange(nextZoomPercent)}
            type="button"
          >
            +
          </button>
        </div>
      </div>
    </section>
  );
}

function GuardZoomControlSection() {
  const zoomPercent = useSyncExternalStore(
    subscribeToGuardZoomChange,
    getGuardZoomPercent,
    () => 100,
  );

  return (
    <GuardZoomSettingSection
      decreaseLabel="화면 축소"
      increaseLabel="화면 확대"
      label="확대/축소"
      nextZoomPercent={increaseGuardZoomPercent(zoomPercent)}
      onChange={setGuardZoomPercent}
      previousZoomPercent={decreaseGuardZoomPercent(zoomPercent)}
      title="화면확대축소"
      zoomPercent={zoomPercent}
    />
  );
}

function GuardFontZoomControlSection() {
  const fontZoomPercent = useSyncExternalStore(
    subscribeToGuardFontZoomChange,
    getGuardFontZoomPercent,
    () => 100,
  );

  return (
    <GuardZoomSettingSection
      decreaseLabel="글자 축소"
      increaseLabel="글자 확대"
      label="확대/축소"
      nextZoomPercent={increaseGuardFontZoomPercent(fontZoomPercent)}
      onChange={setGuardFontZoomPercent}
      previousZoomPercent={decreaseGuardFontZoomPercent(fontZoomPercent)}
      title="글자확대축소"
      zoomPercent={fontZoomPercent}
    />
  );
}

export default function GuardProfilePage() {
  const employeeId = useSyncExternalStore(
    subscribeToGuardSessionChange,
    readGuardEmployeeIdSnapshot,
    () => null,
  );
  const [profile, setProfile] = useState<GuardProfilePayload | null>(null);
  const [passkeyRequest, setPasskeyRequest] = useState<PasskeyRequest>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [error, setError] = useState("");
  const displayedError = error || (!employeeId ? "경비원 정보를 찾을 수 없습니다. 다시 로그인하세요." : "");

  useEffect(() => {
    if (!employeeId) {
      return;
    }

    let ignore = false;
    const guardEmployeeId = employeeId;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/guard/profile?employeeId=${encodeURIComponent(guardEmployeeId)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "개인프로필을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setProfile({
            schedules: payload.schedules ?? [],
            monthlyAttendance: payload.monthlyAttendance ?? [],
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setProfile(null);
          setError(loadError instanceof Error ? loadError.message : "개인프로필을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId) {
      return;
    }

    let ignore = false;
    const guardEmployeeId = employeeId;

    async function loadPasskeyRequest() {
      try {
        setPasskeyLoading(true);
        const response = await fetch(`/api/guard/passkey-requests/me?employeeId=${encodeURIComponent(guardEmployeeId)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "패스키 요청 상태를 불러오지 못했습니다.");
        }

        if (!ignore) {
          setPasskeyRequest(payload.request ?? null);
        }
      } catch (loadError) {
        if (!ignore) {
          setPasskeyMessage(loadError instanceof Error ? loadError.message : "패스키 요청 상태를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setPasskeyLoading(false);
        }
      }
    }

    void loadPasskeyRequest();

    return () => {
      ignore = true;
    };
  }, [employeeId]);

  async function handlePasskeyRequest() {
    if (!employeeId) return;

    try {
      setPasskeyLoading(true);
      setPasskeyMessage("");
      const response = await fetch("/api/guard/passkey-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "패스키 등록 요청을 처리하지 못했습니다.");
      }

      setPasskeyRequest(payload.request);
      setPasskeyMessage("패스키 등록 요청을 보냈습니다. 관리자 승인 후 등록할 수 있습니다.");
    } catch (requestError) {
      setPasskeyMessage(requestError instanceof Error ? requestError.message : "패스키 등록 요청을 처리하지 못했습니다.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handlePasskeyRegistration() {
    if (!employeeId) return;

    try {
      setPasskeyLoading(true);
      setPasskeyMessage("");
      const credentialResponse = await fetch("/api/guard/passkeys/registration-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const credential = await credentialResponse.json();

      if (!credentialResponse.ok) {
        throw new Error(credential.error ?? "패스키 등록 인증 정보를 만들지 못했습니다.");
      }

      const supabase = getSupabasePasskeyClient();
      const signInResult = await supabase.auth.signInWithPassword({
        email: credential.email,
        password: credential.password,
      });
      if (signInResult.error) {
        throw signInResult.error;
      }

      const registerResult = await supabase.auth.registerPasskey();
      if (registerResult.error) {
        throw registerResult.error;
      }

      const completeResponse = await fetch("/api/guard/passkeys/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const completePayload = await completeResponse.json();
      if (!completeResponse.ok) {
        throw new Error(completePayload.error ?? "패스키 등록 완료 처리를 하지 못했습니다.");
      }

      await supabase.auth.signOut();
      setPasskeyRequest(completePayload.request);
      setPasskeyMessage("이 기기에 패스키를 등록했습니다. 다음 로그인부터 패스키로 로그인할 수 있습니다.");
    } catch (registerError) {
      setPasskeyMessage(registerError instanceof Error ? registerError.message : "패스키 등록에 실패했습니다.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  function getPasskeyStatusText() {
    if (passkeyLoading) return "패스키 상태를 확인하는 중입니다.";
    if (!passkeyRequest) return "아직 패스키 등록 요청이 없습니다.";
    if (passkeyRequest.status === "pending") return "관리자 승인 대기 중입니다.";
    if (passkeyRequest.status === "approved") return "승인되었습니다. 이 기기에 패스키를 등록할 수 있습니다.";
    if (passkeyRequest.status === "registered") return "패스키 등록이 완료되었습니다.";
    if (passkeyRequest.status === "rejected") return "관리자가 요청을 거절했습니다.";
    return "패스키 사용이 해제되었습니다.";
  }

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[56px]">
      <div className="max-w-[760px] mx-auto space-y-6">
        <header>
          <h1 className="text-[40px] font-semibold leading-[1.1]">개인프로필</h1>
        </header>

        <GuardZoomControlSection />
        <GuardFontZoomControlSection />

        {displayedError ? <p className="status-warn">{displayedError}</p> : null}
        {loading ? <p className="status-ok">개인프로필을 불러오는 중입니다...</p> : null}

        <section
          aria-label="근무스케줄"
          className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[16px]"
        >
          <h2 className="text-[24px] font-semibold">근무스케줄</h2>
          <ProfileTableShell>
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">기간</th>
                  <th className="text-left">근무지</th>
                </tr>
              </thead>
              <tbody>
                {!loading && (profile?.schedules.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-ink-muted-48 italic">
                      근무스케줄이 없습니다.
                    </td>
                  </tr>
                ) : (
                  profile?.schedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>{schedule.period}</td>
                      <td>{schedule.worksiteName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ProfileTableShell>
        </section>

        <section
          aria-label="월별출근현황"
          className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[16px]"
        >
          <h2 className="text-[24px] font-semibold">월별출근현황</h2>
          <ProfileTableShell>
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">연월</th>
                  <th className="text-left">출근일수</th>
                  <th className="text-left">근무시간합</th>
                </tr>
              </thead>
              <tbody>
                {!loading && (profile?.monthlyAttendance.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      최근 1년 출근현황이 없습니다.
                    </td>
                  </tr>
                ) : (
                  profile?.monthlyAttendance.map((row) => (
                    <tr key={row.yearMonth}>
                      <td>{row.yearMonth}</td>
                      <td>{row.attendanceDays}일</td>
                      <td>{row.workHoursTotal}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ProfileTableShell>
        </section>

        <section
          aria-label="로그아웃"
          className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[16px]"
        >
          <h2 className="text-[24px] font-semibold">로그아웃</h2>
          <div className="mt-4">
            <GuardLogoutButton />
          </div>
        </section>

        <section
          aria-label="패스키 등록"
          className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[16px]"
        >
          <h2 className="text-[24px] font-semibold">패스키등록</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted-48">{getPasskeyStatusText()}</p>
          {passkeyMessage ? <p className="mt-3 text-[14px] leading-relaxed text-primary">{passkeyMessage}</p> : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {!passkeyRequest || passkeyRequest.status === "rejected" || passkeyRequest.status === "revoked" ? (
              <button className="button-primary" disabled={passkeyLoading || !employeeId} onClick={handlePasskeyRequest} type="button">
                패스키 등록 요청
              </button>
            ) : null}
            {passkeyRequest?.status === "approved" ? (
              <button className="button-primary" disabled={passkeyLoading} onClick={handlePasskeyRegistration} type="button">
                이 기기에 패스키 등록
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
