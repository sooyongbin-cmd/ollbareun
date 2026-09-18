"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SaveIcon } from "@/components/icons/save-icon";
import { DeleteIcon } from "@/components/icons/delete-icon";
import { CancelIcon } from "@/components/icons/cancel-icon";
import AlertModal from "@/components/modals/alert-modal";
import ConfirmModal from "@/components/modals/confirm-modal";
import ManagerLoadingMessage from "../../manager-loading-message";

type LeaveRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: "1" | "2";
  startDate: string;
  endDate: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "휴가 자료를 처리하지 못했습니다.");
  }
  return payload as T;
}

async function deleteRequest(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "휴가를 삭제하지 못했습니다.");
  }
}

export default function LeaveDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leaveId = params.id;
  const [record, setRecord] = useState<LeaveRecord | null>(null);
  const [leaveType, setLeaveType] = useState<"1" | "2">("1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(Boolean(leaveId));
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadLeave() {
      try {
        const payload = await fetchJson<{ leave: LeaveRecord }>(`/api/leave/${leaveId}`);
        if (!ignore) {
          setRecord(payload.leave);
          setLeaveType(payload.leave.leaveType);
          setStartDate(payload.leave.startDate);
          setEndDate(payload.leave.endDate);
        }
      } catch (loadFailure) {
        if (!ignore) {
          setLoadError(loadFailure instanceof Error ? loadFailure.message : "휴가 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (!leaveId) {
      return () => {
        ignore = true;
      };
    }

    void loadLeave();
    return () => {
      ignore = true;
    };
  }, [leaveId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await fetchJson(`/api/leave/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: record?.employeeId,
          leaveType,
          startDate,
          endDate,
        }),
      });
      setSuccessMessage("휴가가 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "휴가 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await deleteRequest(`/api/leave/${leaveId}`);
      router.push("/manager/leave");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "휴가를 삭제하지 못했습니다.");
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  const routeError = leaveId ? loadError : "휴가 정보를 불러오지 못했습니다.";

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">휴가상세</h1>
          <p className="max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            선택한 휴가의 종류와 기간을 수정합니다.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p role="alert" className="text-[1rem] text-destructive">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-employee-name">
                  이름
                </label>
                <Input className="w-full bg-muted/50" id="leave-employee-name" value={record?.employeeName ?? "-"} readOnly />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-type">
                  휴가종류
                </label>
                <NativeSelect id="leave-type" value={leaveType} onChange={(event) => setLeaveType(event.target.value as "1" | "2")} required>
                  <NativeSelectOption value="1">월차</NativeSelectOption>
                  <NativeSelectOption value="2">연차</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-start-date">
                  시작일
                </label>
                <Input id="leave-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-end-date">
                  종료일
                </label>
                <Input id="leave-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
              </div>
            </div>

            <div className="flex gap-3">
              <Button aria-label="저장" type="submit" disabled={saving}>
                <SaveIcon size={20} />
              </Button>
              <Button aria-label="삭제" type="button" variant="outline" onClick={() => setDeleteConfirmOpen(true)} disabled={deleting}>
                <DeleteIcon size={20} />
              </Button>
              <Link aria-label="목록" href="/manager/leave" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50">
                <CancelIcon size={20} />
                <span>목록</span>
              </Link>
            </div>
          </form>
        )}
        {error ? <p role="alert" className="mt-6 text-[1rem] text-destructive">{error}</p> : null}
      </section>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="휴가를 삭제하시겠습니까?"
        description="삭제하면 현재 휴가 자료가 완전히 제거됩니다."
        loading={deleting}
      />
      <AlertModal
        isOpen={Boolean(successMessage)}
        onClose={() => {
          setSuccessMessage("");
          router.push("/manager/leave");
        }}
        title="알림"
        description={successMessage}
      />
    </section>
  );
}
