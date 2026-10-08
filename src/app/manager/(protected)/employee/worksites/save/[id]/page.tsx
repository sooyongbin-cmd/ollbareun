"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { GpsInfo } from "@/lib/gps";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import WorksiteGpsPicker from "../../worksite-gps-picker";
import { SaveIcon } from "@/components/icons/save-icon";
import { DeleteIcon } from "@/components/icons/delete-icon";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import ProcessingModal from "@/components/modals/processing-modal";

type Worksite = {
  id: string;
  name: string;
  address: string;
  gps_info: GpsInfo;
  radius_meters: number;
};

type WorksiteResponse = {
  worksite: Worksite;
};

type WorksiteAssignment = {
  id: string;
  employee_name: string;
  employee_role: string | null;
  work_style: "0" | "1" | "2" | null;
  start_date: string;
  end_date: string;
};

type WorksiteAssignmentResponse = {
  assignments: WorksiteAssignment[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "근무지를 불러오지 못했습니다.");
  }

  return payload as T;
}

async function deleteRequest(url: string): Promise<void> {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "근무지를 삭제하지 못했습니다.");
  }
}

function formatWorkStyle(workStyle: WorksiteAssignment["work_style"]) {
  if (workStyle === "0") return "일반근무";
  if (workStyle === "1") return "격일근무";
  if (workStyle === "2") return "야간근무";
  return "근무형태 없음";
}

function formatAssignmentPeriod(assignment: WorksiteAssignment) {
  return assignment.start_date === assignment.end_date
    ? assignment.start_date
    : `${assignment.start_date} ~ ${assignment.end_date}`;
}

export default function WorksiteSavePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const worksiteId = params.id;
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [gpsInfo, setGpsInfo] = useState<GpsInfo | null>(null);
  const [radiusMeters, setRadiusMeters] = useState("");
  const [loading, setLoading] = useState(Boolean(worksiteId));
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("알림");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assignments, setAssignments] = useState<WorksiteAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(Boolean(worksiteId));
  const [assignmentsError, setAssignmentsError] = useState("");
  const routeError = worksiteId ? error : "근무지를 불러오지 못했습니다.";

  useEffect(() => {
    let ignore = false;

    async function loadWorksite() {
      try {
        const data = await fetchJson<WorksiteResponse>(`/api/worksites/${worksiteId}`);
        if (!ignore) {
          setName(data.worksite.name);
          setAddress(data.worksite.address ?? "");
          setGpsInfo(data.worksite.gps_info ?? null);
          setRadiusMeters(String(data.worksite.radius_meters));
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "근무지를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (!worksiteId) {
      return () => {
        ignore = true;
      };
    }

    void loadWorksite();

    return () => {
      ignore = true;
    };
  }, [worksiteId]);

  useEffect(() => {
    let ignore = false;

    async function loadAssignments() {
      try {
        const data = await fetchJson<WorksiteAssignmentResponse>(`/api/worksites/${worksiteId}/assignments`);
        if (!ignore) {
          setAssignments(data.assignments ?? []);
          setAssignmentsError("");
        }
      } catch (loadError) {
        if (!ignore) {
          setAssignmentsError(loadError instanceof Error ? loadError.message : "근무지배정 이력을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setAssignmentsLoading(false);
        }
      }
    }

    if (!worksiteId) {
      setAssignmentsLoading(false);
      return () => {
        ignore = true;
      };
    }

    setAssignments([]);
    setAssignmentsError("");
    setAssignmentsLoading(true);
    void loadAssignments();

    return () => {
      ignore = true;
    };
  }, [worksiteId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    if (!gpsInfo) {
      setError("GPS정보를 입력하거나 지도에서 위치를 선택하세요.");
      return;
    }

    try {
      await fetchJson<WorksiteResponse>(`/api/worksites/${worksiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, gpsInfo, radiusMeters }),
      });

      setAlertMessage("자료가 저장되었습니다.");
      setAlertTitle("알림");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "근무지를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      await deleteRequest(`/api/worksites/${worksiteId}`);
      setAlertMessage("자료가 삭제되었습니다.");
      setAlertTitle("알림");
    } catch (deleteError) {
      setAlertMessage(deleteError instanceof Error ? deleteError.message : "근무지를 삭제하지 못했습니다.");
      setAlertTitle("삭제 실패");
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
          <h1 className="text-[1.75rem] leading-[1.2]">근무지 상세</h1>
        </div>
      </header>

      <section className="manager-section bg-muted/40 rounded-xl border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p className="text-[1rem] text-destructive">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-name">
                  근무지명
                </label>
                <Input
                  className="w-full"
                  id="worksite-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-address">
                  근무지주소
                </label>
                <Input
                  className="w-full"
                  id="worksite-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                />
              </div>
              <WorksiteGpsPicker address={address} value={gpsInfo} onChange={setGpsInfo} />
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-radius">
                  허용반경(m)
                </label>
                <Input
                  className="w-full"
                  id="worksite-radius"
                  value={radiusMeters}
                  onChange={(event) => setRadiusMeters(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button aria-label="저장" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto" disabled={saving || deleting} type="submit">
                <SaveIcon size={20} />
              </Button>
              <Button
                aria-label="삭제"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                type="button"
                disabled={saving || deleting}
                onClick={() => setDeleteConfirmOpen(true)}
                variant="outline"
              >
                <DeleteIcon size={20} />
              </Button>
              <Button
                aria-label="목록"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:ml-auto w-full md:w-auto"
                type="button"
                disabled={saving || deleting}
                onClick={() => router.push("/manager/employee/worksites")}
                variant="outline"
              >
                목록
              </Button>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[1rem] text-destructive">{error}</p> : null}
      </section>

      {!loading && !routeError ? (
        <section aria-labelledby="worksite-assignment-history-title" className="manager-section bg-muted/40 rounded-xl border border-border/50">
          <h2 id="worksite-assignment-history-title" className="text-[1.25rem] font-semibold">
            근무지배정 이력
          </h2>

          {assignmentsLoading ? (
            <ManagerLoadingMessage className="mt-6" />
          ) : assignmentsError ? (
            <p className="mt-6 text-[1rem] text-destructive">{assignmentsError}</p>
          ) : (
            <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">이름</TableHead>
                    <TableHead className="text-left">직군</TableHead>
                    <TableHead className="text-left">근무형태</TableHead>
                    <TableHead className="text-left">배정기간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-8 text-center text-muted-foreground italic">
                        근무지배정 이력이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell data-label="이름" className="font-semibold">{assignment.employee_name}</TableCell>
                        <TableCell data-label="직군">{assignment.employee_role ?? "-"}</TableCell>
                        <TableCell data-label="근무형태">{formatWorkStyle(assignment.work_style)}</TableCell>
                        <TableCell data-label="배정기간" className="whitespace-nowrap">
                          {formatAssignmentPeriod(assignment)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="자료를 삭제하시겠습니까?"
        description="근무지배정 자료가 있으면 삭제할 수 없습니다."
        loading={deleting}
        loadingLabel="삭제처리중입니다..."
      />

      <ProcessingModal isOpen={saving} message="저장처리중입니다..." />

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => {
          setAlertMessage("");
          router.push("/manager/employee/worksites");
        }}
        title={alertTitle}
        description={alertMessage}
      />
    </section>
  );
}
