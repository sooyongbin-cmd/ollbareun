"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function LeaveDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const leaveId = params.id;
  const [record, setRecord] = useState<LeaveRecord | null>(null);
  const [loading, setLoading] = useState(Boolean(leaveId));
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadLeave() {
      try {
        const payload = await fetchJson<{ leave: LeaveRecord }>(`/api/leave/${leaveId}`);
        if (!ignore) {
          setRecord(payload.leave);
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
        </div>
      </header>

      <section className="manager-section rounded-xl border border-border/50 bg-muted/40">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p role="alert" className="text-[1rem] text-destructive">{routeError}</p>
        ) : (
          <div className="space-y-6">
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
                <Input id="leave-type" value={record?.leaveType ?? ""} readOnly />
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
                <Input id="leave-end-date" value={record?.endDate ?? ""} readOnly />
              </div>
            </div>

            <div className="flex gap-3">
              <Button aria-label="삭제" type="button" variant="outline" onClick={() => setDeleteConfirmOpen(true)} disabled={deleting}>
                <DeleteIcon size={20} />
              </Button>
              <Button aria-label="목록" type="button" variant="outline" onClick={() => router.push("/manager/leave")} disabled={deleting} className="md:ml-auto">
                목록
              </Button>
            </div>
          </div>
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
