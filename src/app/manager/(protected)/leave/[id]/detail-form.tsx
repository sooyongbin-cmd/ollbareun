"use client";

import type { DetailViewProps } from "@/components/modals/detail-modal-link";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { parseLeaveTypes } from "@/lib/leave-types";
import { SaveIcon } from "@/components/icons/save-icon";
import { DeleteIcon } from "@/components/icons/delete-icon";
import ConfirmModal from "@/components/modals/confirm-modal";
import ManagerLoadingMessage from "../../manager-loading-message";

type LeaveRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
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

export default function LeaveDetailPage({ recordId, modal = false, onClose, onSaved, onDeleted }: DetailViewProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leaveId = recordId ?? params?.id;
  const [record, setRecord] = useState<LeaveRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(leaveId));
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  const [optionsError, setOptionsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadLeave() {
      try {
        const payload = await fetchJson<{ leave: LeaveRecord }>(`/api/leave/${leaveId}`);
        if (!ignore) {
          setRecord(payload.leave);
          setLeaveType(payload.leave.leaveType);
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
    void fetchJson<{ config: { content: string } }>("/api/system/configs/leave_code")
      .then(({ config }) => { if (!ignore) setLeaveTypes(parseLeaveTypes(config.content)); })
      .catch(() => { if (!ignore) setOptionsError("휴가종류 목록을 불러오지 못했습니다."); });
    return () => {
      ignore = true;
    };
  }, [leaveId]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record || saving || deleting) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const { leave } = await fetchJson<{ leave: Pick<LeaveRecord, "id" | "leaveType" | "endDate"> }>(`/api/leave/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveType, endDate }),
      });
      setRecord({ ...record, ...leave });
      onSaved?.(leave);
      setSaved(true);
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
      if (onDeleted) {
        onDeleted();
        return;
      }
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
      {!modal ? <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">휴가상세</h1>
        </div>
      </header> : null}

      <section className="manager-section rounded-xl border border-border/50 bg-muted/40">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p role="alert" className="text-[1rem] text-destructive">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSave}>
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
                <NativeSelect id="leave-type" value={leaveType} onChange={(event) => { setLeaveType(event.target.value); setSaved(false); }} disabled={saving || deleting} required>
                  {[...new Set([record?.leaveType, ...leaveTypes])].filter(Boolean).map((type) => (
                    <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>
                  ))}
                </NativeSelect>
                {optionsError ? <p role="alert" className="text-sm text-destructive">{optionsError}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-start-date">
                  시작일
                </label>
                <Input id="leave-start-date" value={record?.startDate ?? ""} readOnly />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-end-date">
                  종료일
                </label>
                <Input id="leave-end-date" type="date" min={record?.startDate} value={endDate}
                  onChange={(event) => { setEndDate(event.target.value); setSaved(false); }} disabled={saving || deleting} required />
              </div>
            </div>

            <div className="flex gap-3">
              <Button aria-label="저장" type="submit" disabled={saving || deleting || !record}>
                <SaveIcon size={20} />
              </Button>
              <Button aria-label="삭제" type="button" variant="outline" onClick={() => setDeleteConfirmOpen(true)} disabled={saving || deleting}>
                <DeleteIcon size={20} />
              </Button>
              <Button aria-label={modal ? "닫기" : "목록"} type="button" variant="outline" onClick={() => onClose ? onClose() : router.push("/manager/leave")} disabled={saving || deleting} className="md:ml-auto">
                {modal ? "닫기" : "목록"}
              </Button>
            </div>
            {saved ? <p role="status">휴가 정보를 저장했습니다.</p> : null}
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
        loadingLabel="삭제처리중입니다..."
      />
    </section>
  );
}
