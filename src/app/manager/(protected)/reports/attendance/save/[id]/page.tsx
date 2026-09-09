"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AlertModal from "@/components/modals/alert-modal";
import ConfirmModal from "@/components/modals/confirm-modal";
import { DeleteIcon } from "@/components/icons/delete-icon";
import { SaveIcon } from "@/components/icons/save-icon";
import { CancelIcon } from "@/components/icons/cancel-icon";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import type { AttendanceRecord } from "@/lib/manager-reports";

type AttendanceResponse = {
  attendance: AttendanceRecord;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "근태 기록을 불러오지 못했습니다.");
  }

  return payload as T;
}

async function deleteRequest(url: string) {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "근태 기록을 삭제하지 못했습니다.");
  }
}

function toDateTimeLocal(value: string | null) {
  if (!value || value === "-") {
    return "";
  }

  return value.replace(" ", "T");
}

function AttendanceAddress({ id, label, latitude, longitude }: {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
}) {
  const [address, setAddress] = useState("주소 조회 중…");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });
    async function loadAddress() {
      try {
        const data = await fetchJson<{ address: string }>(`/api/kakao/reverse-geocode?${params}`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setAddress(data.address || "주소를 찾을 수 없습니다.");
      } catch {
        if (!controller.signal.aborted) setAddress("주소를 조회하지 못했습니다.");
      }
    }
    void loadAddress();
    return () => controller.abort();
  }, [latitude, longitude]);

  return (
    <div className="space-y-2">
      <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor={id}>{label}</label>
      <Input className="w-full bg-muted/50" id={id} value={address} readOnly />
    </div>
  );
}

export default function AttendanceSavePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const attendanceId = params.id;
  const [employeeName, setEmployeeName] = useState("");
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [clockInDateTime, setClockInDateTime] = useState("");
  const [clockOutDateTime, setClockOutDateTime] = useState("");
  const [clockOutEnabled, setClockOutEnabled] = useState(false);
  const [loading, setLoading] = useState(Boolean(attendanceId));
  const [error, setError] = useState("");
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);
  const routeError = attendanceId ? error : "근태 기록을 불러오지 못했습니다.";

  useEffect(() => {
    let ignore = false;

    async function loadAttendance() {
      try {
        const data = await fetchJson<AttendanceResponse>(`/api/manager/reports/attendance/${attendanceId}`);
        if (!ignore) {
          setEmployeeName(data.attendance.employeeName);
          setRecord(data.attendance);
          setClockInDateTime(toDateTimeLocal(data.attendance.clockInDateTime));
          setClockOutDateTime(toDateTimeLocal(data.attendance.clockOutDateTime));
          setClockOutEnabled(Boolean(data.attendance.clockOutDateTime));
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "근태 기록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (!attendanceId) {
      return () => {
        ignore = true;
      };
    }

    void loadAttendance();

    return () => {
      ignore = true;
    };
  }, [attendanceId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveConfirmOpen(true);
  }

  async function handleSave() {
    if (saving || !attendanceId) return;

    setSaving(true);
    setError("");

    try {
      await fetchJson(`/api/manager/reports/attendance/${attendanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clockInDateTime, ...(clockOutEnabled ? { clockOutDateTime } : {}) }),
      });

      setSaveSuccessOpen(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "근태 기록을 수정하지 못했습니다.");
    } finally {
      setSaving(false);
      setSaveConfirmOpen(false);
    }
  }

  async function handleDelete() {
    if (deleting || !attendanceId) return;

    setDeleting(true);
    setError("");

    try {
      await deleteRequest(`/api/manager/reports/attendance/${attendanceId}`);
      router.push("/manager/reports/attendance");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "근태 기록을 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">근태기록수정</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            선택한 근태 기록의 출근일시와 퇴근일시를 수정합니다.
          </p>
        </div>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p className="text-[1rem] text-destructive">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="attendance-employee-name">
                  직원이름
                </label>
                <Input className="w-full" id="attendance-employee-name" value={employeeName} readOnly />
              </div>
              {[
                { id: "worksite-name", label: "근무지", value: record?.worksiteName },
              ].map((field) => (
                <div className="space-y-2" key={field.id}>
                  <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor={field.id}>
                    {field.label}
                  </label>
                  <Input className="w-full bg-muted/50" id={field.id} value={field.value ?? "-"} readOnly />
                </div>
              ))}
              <div className="space-y-4 lg:col-span-2 empty:hidden">
              {[
                { id: "clock-in-address", label: "출근 주소", latitude: record?.clockInLatitude, longitude: record?.clockInLongitude },
                { id: "clock-out-address", label: "퇴근 주소", latitude: record?.clockOutLatitude, longitude: record?.clockOutLongitude },
              ].map(({ id, label, latitude, longitude }) => (
                typeof latitude === "number" && Number.isFinite(latitude) &&
                typeof longitude === "number" && Number.isFinite(longitude)
                  ? <AttendanceAddress key={`${id}-${latitude}-${longitude}`} id={id} label={label} latitude={latitude} longitude={longitude} />
                  : null
              ))}
              </div>
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="clock-in-date-time">
                  출근일시
                </label>
                <Input
                  autoFocus
                  className="w-full"
                  id="clock-in-date-time"
                  type="datetime-local"
                  value={clockInDateTime}
                  onChange={(event) => setClockInDateTime(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2" hidden={!clockOutEnabled}>
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="clock-out-date-time">
                  퇴근일시
                </label>
                <Input
                  className="w-full"
                  id="clock-out-date-time"
                  type="datetime-local"
                  required={clockOutEnabled && !record?.clockOutDateTime}
                  value={clockOutDateTime}
                  onChange={(event) => setClockOutDateTime(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button aria-label="저장" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto" type="submit">
                <SaveIcon size={20} />
              </Button>
              <Button
                aria-label="삭제"
                className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:w-auto"
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                variant="outline"
              >
                <DeleteIcon size={20} />
              </Button>
              {!clockOutEnabled && (
                <Button
                  className="min-h-10 w-full md:w-auto"
                  type="button"
                  variant="outline"
                  onClick={() => setClockOutEnabled(true)}
                >
                  퇴근처리
                </Button>
              )}
              <Link
                aria-label="취소"
                title="취소"
                className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:w-auto"
                href="/manager/reports/attendance"
              >
                <CancelIcon size={20} />
              </Link>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[1rem] text-destructive">{error}</p> : null}
      </section>

      <ConfirmModal
        isOpen={saveConfirmOpen}
        onClose={() => {
          if (!saving) setSaveConfirmOpen(false);
        }}
        onConfirm={handleSave}
        title="변경사항을 저장할까요?"
        loading={saving}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          if (!deleting) setDeleteConfirmOpen(false);
        }}
        onConfirm={handleDelete}
        title="현재 근태기록을 삭제할까요?"
        description="삭제한 근태기록은 복구할 수 없습니다."
        loading={deleting}
      />

      <AlertModal
        isOpen={saveSuccessOpen}
        onClose={() => {
          setSaveSuccessOpen(false);
          router.push("/manager/reports/attendance");
        }}
        title="알림"
        description="수정이 완료되었습니다."
      />
    </section>
  );
}
