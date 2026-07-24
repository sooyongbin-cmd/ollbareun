"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getSupabasePasskeyClient } from "@/lib/supabase-passkey-client";
import {
  readStoredGuardSessionSnapshot,
  subscribeToGuardSessionChange,
} from "../../guard-session-storage";
import {
  decreaseGuardFontZoomPercent,
  getGuardFontZoomPercent,
  increaseGuardFontZoomPercent,
  setGuardFontZoomPercent,
  subscribeToGuardFontZoomChange,
} from "../../guard-zoom";
import GuardLogoutButton from "../guard-logout-button";
import { GuardPageHeader } from "@/components/guard/guard-page-header";
import { GuardResponsiveTable } from "@/components/guard/guard-responsive-table";
import { GuardStatusAlert } from "@/components/guard/guard-status-alert";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Type, Calendar, History, KeyRound, LogOut, Minus, Plus } from "lucide-react";

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
    <Card className="w-full shadow-sm border" aria-label={title}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Type className="size-4 text-primary" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-4 border">
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={decreaseLabel}
              disabled={previousZoomPercent === zoomPercent}
              onClick={() => onChange(previousZoomPercent)}
              type="button"
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-[60px] text-center text-sm font-bold">{zoomPercent}%</span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={increaseLabel}
              disabled={nextZoomPercent === zoomPercent}
              onClick={() => onChange(nextZoomPercent)}
              type="button"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <div className="w-full space-y-6">
      <GuardPageHeader
        title="개인프로필"
        description="글자 확대 설정, 근무 스케줄 및 개인근태 내역을 확인합니다."
      />

      {/* 1. Font Zoom Control Card (Top Priority) */}
      <GuardFontZoomControlSection />

      {displayedError ? (
        <GuardStatusAlert status="warning" title="세션 안내" description={displayedError} />
      ) : null}

      {/* 2. Work Schedule Card */}
      <Card className="w-full shadow-sm border" aria-label="근무스케줄">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            <span>근무스케줄</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <GuardResponsiveTable<ScheduleRow>
              columns={[
                { key: "period", header: "기간" },
                { key: "worksiteName", header: "근무지" },
              ]}
              data={profile?.schedules ?? []}
              keyExtractor={(item) => item.id}
              renderCell={(item, key) => (key === "period" ? item.period : item.worksiteName)}
              emptyMessage="근무스케줄이 없습니다."
            />
          )}
        </CardContent>
      </Card>

      {/* 3. Monthly Attendance Status Card */}
      <Card className="w-full shadow-sm border" aria-label="월별출근현황">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="size-4 text-primary" />
            <span>월별출근현황</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <GuardResponsiveTable<MonthlyAttendanceRow>
              columns={[
                { key: "yearMonth", header: "연월" },
                { key: "attendanceDays", header: "출근일수" },
                { key: "workHoursTotal", header: "근무시간합" },
              ]}
              data={profile?.monthlyAttendance ?? []}
              keyExtractor={(item) => item.yearMonth}
              renderCell={(item, key) => {
                if (key === "yearMonth") return item.yearMonth;
                if (key === "attendanceDays") return `${item.attendanceDays}일`;
                return item.workHoursTotal;
              }}
              emptyMessage="최근 1년 출근현황이 없습니다."
            />
          )}
        </CardContent>
      </Card>

      {/* 4. Logout Card (Directly above Passkey Card) */}
      <Card className="w-full shadow-sm border" aria-label="로그아웃">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <LogOut className="size-4 text-destructive" />
            <span>로그아웃</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GuardLogoutButton />
        </CardContent>
      </Card>

      {/* 5. Passkey Registration Card */}
      <Card className="w-full shadow-sm border" aria-label="패스키 등록">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            <span>패스키등록</span>
          </CardTitle>
          <CardDescription className="text-xs">
            {getPasskeyStatusText()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {passkeyMessage ? (
            <GuardStatusAlert status="info" title="패스키 안내" description={passkeyMessage} />
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {!passkeyRequest || passkeyRequest.status === "rejected" || passkeyRequest.status === "revoked" ? (
              <GuardActionButton
                disabled={passkeyLoading || !employeeId}
                isLoading={passkeyLoading}
                onClick={handlePasskeyRequest}
              >
                패스키 등록 요청
              </GuardActionButton>
            ) : null}

            {passkeyRequest?.status === "approved" ? (
              <GuardActionButton
                disabled={passkeyLoading}
                isLoading={passkeyLoading}
                onClick={handlePasskeyRegistration}
              >
                이 기기에 패스키 등록
              </GuardActionButton>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
