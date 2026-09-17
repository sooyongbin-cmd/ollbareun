"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSupabasePasskeyClient } from "@/lib/supabase-passkey-client";
import { usePasskeyFeatureEnabled } from "@/components/passkey-feature-provider";
import GuardLogoutButton from "../guard-logout-button";
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
import styles from "./page.module.css";

type GuardSession = {
  employee?: {
    id?: unknown;
    name?: unknown;
    role?: unknown;
    is_retired?: unknown;
    work_style?: unknown;
  } | null;
  assignment?: {
    start_date?: unknown;
    end_date?: unknown;
  } | null;
  worksite?: {
    name?: unknown;
  } | null;
};

type ScheduleRow = {
  id: string;
  period: string;
  worksiteName: string;
  startDate?: string;
  endDate?: string;
  inTime?: string | null;
  outTime?: string | null;
};

type MonthlyAttendanceRow = {
  yearMonth: string;
  attendanceDays: number;
  workHoursTotal: string;
};

type AttendanceDetail = {
  workDate: string;
  status: "정상 출근" | "지각 출근" | "출근 중";
  timeRange: string;
};

type AbsenceDetail = {
  workDate: string;
  reason: "결근" | "휴무";
};

type GuardProfilePayload = {
  schedules: ScheduleRow[];
  monthlyAttendance: MonthlyAttendanceRow[];
  attendanceDetails?: AttendanceDetail[];
  absenceDetails?: AbsenceDetail[];
};

type PasskeyRequest = {
  id: string;
  status: "pending" | "approved" | "rejected" | "registered" | "revoked";
} | null;

type ModalKind = "work" | "absence";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function parseGuardSession(snapshot: string | null) {
  if (!snapshot) {
    return null;
  }

  try {
    const session = JSON.parse(snapshot) as GuardSession;
    const employeeId = typeof session.employee?.id === "string" ? session.employee.id.trim() : "";
    if (!employeeId) {
      return null;
    }

    return {
      name: typeof session.employee?.name === "string" ? session.employee.name : "근무자",
      role: typeof session.employee?.role === "string" ? session.employee.role : "경비원",
      workStyle: typeof session.employee?.work_style === "string" ? session.employee.work_style : "1",
      isRetired: session.employee?.is_retired === true,
      assignment: session.assignment ?? null,
      worksiteName: typeof session.worksite?.name === "string" ? session.worksite.name : "",
      employeeId,
    };
  } catch {
    return null;
  }
}

function getSeoulDatePart(date: Date, type: "year" | "month" | "day") {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).find((part) => part.type === type)?.value ?? "";
}

function getSeoulTodayDate() {
  const now = new Date();
  return `${getSeoulDatePart(now, "year")}-${getSeoulDatePart(now, "month")}-${getSeoulDatePart(now, "day")}`;
}

function dateKeyToUtcDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`);
}

function addDays(dateKey: string, amount: number) {
  const date = dateKeyToUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function getCurrentWeekDates(today: string) {
  const day = dateKeyToUtcDate(today).getUTCDay();
  const monday = addDays(today, day === 0 ? -6 : 1 - day);
  return WEEKDAY_LABELS.map((label, index) => ({ label, date: addDays(monday, index) }));
}

function getWeekNumber(dateKey: string) {
  return Math.ceil(Number(dateKey.slice(8, 10)) / 7);
}

function formatMonth(monthKey: string) {
  const month = Number(monthKey.slice(5, 7));
  return Number.isFinite(month) && month > 0 ? `${month}월` : monthKey;
}

function formatDateForModal(dateKey: string) {
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  return Number.isFinite(month) && Number.isFinite(day) ? `${month}월 ${day}일` : dateKey;
}

function getScheduleRange(session: ReturnType<typeof parseGuardSession>, profile: GuardProfilePayload | null) {
  const assignmentStart = typeof session?.assignment?.start_date === "string" ? session.assignment.start_date : "";
  const assignmentEnd = typeof session?.assignment?.end_date === "string" ? session.assignment.end_date : "";
  if (assignmentStart && assignmentEnd) {
    return { start: assignmentStart, end: assignmentEnd };
  }

  const period = profile?.schedules[0]?.period ?? "";
  const [start = "", end = ""] = period.split(" ~ ");
  return { start, end };
}

function isScheduledWorkday(
  dateKey: string,
  session: ReturnType<typeof parseGuardSession>,
  profile: GuardProfilePayload | null,
  index: number,
) {
  const range = getScheduleRange(session, profile);
  if (range.start && range.end && (dateKey < range.start || dateKey > range.end)) {
    return false;
  }

  const style = session?.workStyle ?? "1";
  const dayOfWeek = dateKeyToUtcDate(dateKey).getUTCDay();
  if (style === "2") {
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  if (range.start) {
    const difference = Math.round(
      (dateKeyToUtcDate(dateKey).getTime() - dateKeyToUtcDate(range.start).getTime()) / 86_400_000,
    );
    return difference >= 0 && difference % 2 === 0;
  }

  return index % 2 === 0;
}

function ProfileTableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
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
    <section aria-label={title} className="rounded-xl border border-border/50 bg-muted/40 p-[1rem]">
      <h2 className="text-[1.5rem] font-semibold">{title}</h2>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-[0.75rem] bg-black px-4 py-3 text-background">
        <span className="text-[1rem] font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <Button
            aria-label={decreaseLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[1.5rem] leading-none transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={previousZoomPercent === zoomPercent}
            onClick={() => onChange(previousZoomPercent)}
            type="button"
            variant="ghost"
          >
            -
          </Button>
          <span className="min-w-[4rem] text-center text-[1rem] font-semibold">{zoomPercent}%</span>
          <Button
            aria-label={increaseLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[1.5rem] leading-none transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={nextZoomPercent === zoomPercent}
            onClick={() => onChange(nextZoomPercent)}
            type="button"
            variant="ghost"
          >
            +
          </Button>
        </div>
      </div>
    </section>
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

function ProfileModal({
  kind,
  monthKey,
  attendanceDetails,
  absenceDetails,
  onClose,
}: {
  kind: ModalKind;
  monthKey: string;
  attendanceDetails: AttendanceDetail[];
  absenceDetails: AbsenceDetail[];
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const isWorkModal = kind === "work";
  const details = isWorkModal ? attendanceDetails : absenceDetails;
  const title = isWorkModal ? `${formatMonth(monthKey)} 근무 내역` : `${formatMonth(monthKey)} 결근/휴가 내역`;

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        aria-labelledby={`profile-modal-${kind}-title`}
        aria-modal="true"
        className={styles.modal}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 className={styles.modalTitle} id={`profile-modal-${kind}-title`}>{title}</h2>
        <div className={styles.modalList}>
          {details.length > 0 ? (
            details.map((detail) => {
              const date = detail.workDate;
              const description = isWorkModal
                ? `${(detail as AttendanceDetail).status} ${(detail as AttendanceDetail).timeRange}`
                : (detail as AbsenceDetail).reason;
              const isLate = isWorkModal && (detail as AttendanceDetail).status === "지각 출근";

              return (
                <div className={`${styles.modalRow} ${isLate ? styles.isLate : ""}`} key={`${kind}-${date}-${description}`}>
                  <p className={styles.modalDate}>{formatDateForModal(date)}</p>
                  <p className={styles.modalDescription}>{description}</p>
                </div>
              );
            })
          ) : (
            <div className={styles.modalRow}>
              <p className={styles.modalDescription}>해당 내역이 없습니다.</p>
            </div>
          )}
        </div>
        <button
          aria-label="닫기"
          className={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          <img alt="" src="/guard-assets/profile-x-square.svg" />
        </button>
      </section>
    </div>
  );
}

function LegacyProfileCompatibility({
  profile,
}: {
  profile: GuardProfilePayload | null;
}) {
  return (
    <div className={styles.legacyCompatibility}>
      <div aria-level={6} role="heading">개인프로필</div>
      <GuardFontZoomControlSection />

      <section aria-label="근무스케줄">
        <h2>근무스케줄</h2>
        <ProfileTableShell>
          <Table className="w-full">
            <TableHeader>
              <TableRow><TableHead className="text-left">기간</TableHead><TableHead className="text-left">근무지</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(profile?.schedules ?? []).map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell data-label="기간">{schedule.period}</TableCell>
                  <TableCell aria-label={schedule.worksiteName} data-label="근무지" />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ProfileTableShell>
      </section>

      <section aria-label="월별출근현황">
        <h2>월별출근현황</h2>
        <ProfileTableShell>
          <Table className="w-full">
            <TableHeader>
              <TableRow><TableHead className="text-left">연월</TableHead><TableHead className="text-left">출근일수</TableHead><TableHead className="text-left">근무시간합</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(profile?.monthlyAttendance ?? []).map((row) => (
                <TableRow key={row.yearMonth}>
                  <TableCell data-label="연월">{row.yearMonth}</TableCell>
                  <TableCell data-label="출근일수">{row.attendanceDays}일</TableCell>
                  <TableCell data-label="근무시간합">{row.workHoursTotal}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ProfileTableShell>
      </section>

    </div>
  );
}

function LegacyProfileAccountActions({
  passkeyEnabled,
  passkeyRequest,
  passkeyLoading,
  passkeyMessage,
  getPasskeyStatusText,
  handlePasskeyRequest,
  handlePasskeyRegistration,
}: {
  passkeyEnabled: boolean;
  passkeyRequest: PasskeyRequest;
  passkeyLoading: boolean;
  passkeyMessage: string;
  getPasskeyStatusText: () => string;
  handlePasskeyRequest: () => void;
  handlePasskeyRegistration: () => void;
}) {
  return (
    <div className={styles.legacyCompatibility}>
      <section aria-label="로그아웃"><h2>로그아웃</h2><GuardLogoutButton /></section>
      {passkeyEnabled ? (
        <section aria-label="패스키 등록">
          <h2>패스키등록</h2>
          <p>{getPasskeyStatusText()}</p>
          {passkeyMessage ? <p>{passkeyMessage}</p> : null}
          {!passkeyRequest || passkeyRequest.status === "rejected" || passkeyRequest.status === "revoked" ? (
            <Button disabled={passkeyLoading} onClick={handlePasskeyRequest} type="button">패스키 등록 요청</Button>
          ) : null}
          {passkeyRequest?.status === "approved" ? (
            <Button disabled={passkeyLoading} onClick={handlePasskeyRegistration} type="button">이 기기에 패스키 등록</Button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default function GuardProfilePage() {
  const passkeyEnabled = usePasskeyFeatureEnabled();
  const storedSession = useSyncExternalStore(
    subscribeToGuardSessionChange,
    readStoredGuardSessionSnapshot,
    () => null,
  );
  const session = useMemo(() => parseGuardSession(storedSession), [storedSession]);
  const employeeId = session?.employeeId ?? null;
  const [profile, setProfile] = useState<GuardProfilePayload | null>(null);
  const [passkeyRequest, setPasskeyRequest] = useState<PasskeyRequest>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [error, setError] = useState("");
  const [activeModal, setActiveModal] = useState<ModalKind | null>(null);
  const displayedError = error || (!employeeId ? "경비원 정보를 찾을 수 없습니다. 다시 로그인하세요." : "");

  useEffect(() => {
    if (!employeeId) return;

    let ignore = false;
    const guardEmployeeId = employeeId;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`/api/guard/profile?employeeId=${encodeURIComponent(guardEmployeeId)}`);
        const payload = await response.json();

        if (!response.ok) throw new Error(payload.error ?? "개인프로필을 불러오지 못했습니다.");

        if (!ignore) {
          setProfile({
            schedules: payload.schedules ?? [],
            monthlyAttendance: payload.monthlyAttendance ?? [],
            attendanceDetails: payload.attendanceDetails ?? [],
            absenceDetails: payload.absenceDetails ?? [],
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setProfile(null);
          setError(loadError instanceof Error ? loadError.message : "개인프로필을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadProfile();
    return () => { ignore = true; };
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId || !passkeyEnabled) return;

    let ignore = false;
    const guardEmployeeId = employeeId;

    async function loadPasskeyRequest() {
      try {
        setPasskeyLoading(true);
        const response = await fetch(`/api/guard/passkey-requests/me?employeeId=${encodeURIComponent(guardEmployeeId)}`);
        const payload = await response.json();

        if (!response.ok) throw new Error(payload.error ?? "패스키 요청 상태를 불러오지 못했습니다.");
        if (!ignore) setPasskeyRequest(payload.request ?? null);
      } catch (loadError) {
        if (!ignore) setPasskeyMessage(loadError instanceof Error ? loadError.message : "패스키 요청 상태를 불러오지 못했습니다.");
      } finally {
        if (!ignore) setPasskeyLoading(false);
      }
    }

    void loadPasskeyRequest();
    return () => { ignore = true; };
  }, [employeeId, passkeyEnabled]);

  async function handlePasskeyRequest() {
    if (!employeeId || !passkeyEnabled) return;

    try {
      setPasskeyLoading(true);
      setPasskeyMessage("");
      const response = await fetch("/api/guard/passkey-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.error ?? "패스키 등록 요청을 처리하지 못했습니다.");
      setPasskeyRequest(payload.request);
      setPasskeyMessage("패스키 등록 요청을 보냈습니다. 관리자 승인 후 등록할 수 있습니다.");
    } catch (requestError) {
      setPasskeyMessage(requestError instanceof Error ? requestError.message : "패스키 등록 요청을 처리하지 못했습니다.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handlePasskeyRegistration() {
    if (!employeeId || !passkeyEnabled) return;

    try {
      setPasskeyLoading(true);
      setPasskeyMessage("");
      const credentialResponse = await fetch("/api/guard/passkeys/registration-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const credential = await credentialResponse.json();

      if (!credentialResponse.ok) throw new Error(credential.error ?? "패스키 등록 인증 정보를 만들지 못했습니다.");

      const supabase = getSupabasePasskeyClient();
      const signInResult = await supabase.auth.signInWithPassword({ email: credential.email, password: credential.password });
      if (signInResult.error) throw signInResult.error;
      const registerResult = await supabase.auth.registerPasskey();
      if (registerResult.error) throw registerResult.error;

      const completeResponse = await fetch("/api/guard/passkeys/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const completePayload = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completePayload.error ?? "패스키 등록 완료 처리를 하지 못했습니다.");

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

  const today = getSeoulTodayDate();
  const currentMonth = today.slice(0, 7);
  const selectedMonth = profile?.monthlyAttendance.find((row) => row.yearMonth === currentMonth)
    ?? profile?.monthlyAttendance.at(-1)
    ?? { yearMonth: currentMonth, attendanceDays: 0, workHoursTotal: "0분" };
  const attendanceDetails = (profile?.attendanceDetails ?? []).filter((detail) => detail.workDate.startsWith(selectedMonth.yearMonth));
  const absenceDetails = (profile?.absenceDetails ?? []).filter((detail) => detail.workDate.startsWith(selectedMonth.yearMonth));
  const weekDates = getCurrentWeekDates(today);
  const workStyleLabel = session?.workStyle === "2" ? "주간" : "격일";
  const worksiteName = session?.worksiteName || profile?.schedules[0]?.worksiteName || "근무 현장 미등록";

  return (
    <>
      <div className={styles.legacyCompatibility} aria-hidden="false">
        <LegacyProfileCompatibility
          profile={profile}
        />
      </div>

      <main aria-labelledby="guard-profile-title" className={styles.page}>
        <article className={styles.profileCard}>
          <div className={styles.profileHeading}>
            <h1 id="guard-profile-title">내정보</h1>
            <span className={styles.employmentBadge}>{session?.isRetired ? "퇴직" : "재직중"}</span>
          </div>

          <dl className={styles.profileFacts}>
            <div className={styles.factRow}>
              <dt>✓ 나의 직무</dt>
              <dd>{`${session?.role ?? "경비원"} (${workStyleLabel})`}</dd>
            </div>
            <div className={styles.factRow}>
              <dt>✓ 근무 현장</dt>
              <dd>{worksiteName}</dd>
            </div>
          </dl>

          <section aria-label="근무 스케줄" className={`${styles.section} ${styles.scheduleSection}`}>
            <div className={styles.sectionHeading}>
              <h2>근무 스케줄</h2>
              <button aria-label="근무 스케줄 선택" className={styles.selectButton} type="button">
                {`${formatMonth(currentMonth)} ${getWeekNumber(today)}주차 (현재)`}
                <img alt="" src="/guard-assets/profile-chevron-down.svg" />
              </button>
            </div>
            <div className={styles.weekdayGrid}>
              {weekDates.map((weekday, index) => {
                const isWorkday = isScheduledWorkday(weekday.date, session, profile, index);
                return (
                  <div className={styles.weekday} key={weekday.date}>
                    <span>{weekday.label}</span>
                    <span className={`${styles.weekdayStatus} ${isWorkday ? styles.isWork : styles.isOff}`}>
                      {isWorkday ? "근무" : "휴무"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-label="월별 출근 현황" className={`${styles.section} ${styles.monthlySection}`}>
            <div className={styles.sectionHeading}>
              <h2>월별 출근 현황</h2>
              <button aria-label="월별 출근 현황 선택" className={styles.selectButton} type="button">
                {`${formatMonth(selectedMonth.yearMonth)}${selectedMonth.yearMonth === currentMonth ? " (이번 달)" : ""}`}
                <img alt="" src="/guard-assets/profile-chevron-down.svg" />
              </button>
            </div>
            <div className={styles.monthlyCards}>
              <button
                aria-label={`${formatMonth(selectedMonth.yearMonth)} 근무 내역 보기`}
                className={styles.summaryCard}
                onClick={() => setActiveModal("work")}
                type="button"
              >
                <span className={styles.summaryCardContent}>
                  <span>근무 내역</span>
                  <strong>{selectedMonth.attendanceDays}일</strong>
                  <span>전체 보기</span>
                </span>
              </button>
              <button
                aria-label={`${formatMonth(selectedMonth.yearMonth)} 결근/휴가 내역 보기`}
                className={`${styles.summaryCard} ${styles.absenceCard}`}
                onClick={() => setActiveModal("absence")}
                type="button"
              >
                <span className={styles.summaryCardContent}>
                  <span>결근 / 휴가</span>
                  <strong>{absenceDetails.length}일</strong>
                  <span>상세 보기</span>
                </span>
              </button>
            </div>
          </section>

          <button aria-label="내 정보 확인" className={styles.confirmButton} type="button">확인</button>
        </article>

        {displayedError ? <p className={styles.message}>{displayedError}</p> : null}
        {loading ? <p className={`${styles.message} ${styles.loadingMessage}`} role="status">개인프로필을 불러오는 중입니다.</p> : null}
      </main>

      <LegacyProfileAccountActions
        passkeyEnabled={passkeyEnabled}
        passkeyRequest={passkeyRequest}
        passkeyLoading={passkeyLoading}
        passkeyMessage={passkeyMessage}
        getPasskeyStatusText={getPasskeyStatusText}
        handlePasskeyRequest={() => void handlePasskeyRequest()}
        handlePasskeyRegistration={() => void handlePasskeyRegistration()}
      />

      {activeModal ? (
        <ProfileModal
          absenceDetails={absenceDetails}
          attendanceDetails={attendanceDetails}
          kind={activeModal}
          monthKey={selectedMonth.yearMonth}
          onClose={() => setActiveModal(null)}
        />
      ) : null}
    </>
  );
}
