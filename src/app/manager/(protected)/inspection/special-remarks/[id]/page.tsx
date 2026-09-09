"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../../manager-loading-message";

type PageProps = {
  params: Promise<{ id: string }>;
};

type SpecialRemarkReport = {
  id: string;
  reported_at: string;
  employee_name: string;
  content: string;
  photo_url: string | null;
  processing_status: "Y" | "N";
  gps_info: { latitude: number; longitude: number } | null;
};

function formatDateTime(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

async function fetchReport(id: string) {
  const response = await fetch(`/api/inspection/special-remarks/${encodeURIComponent(id)}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "특이사항을 불러오지 못했습니다.");
  }

  return payload.report as SpecialRemarkReport;
}

export default function SpecialRemarkDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [reportId, setReportId] = useState("");
  const [report, setReport] = useState<SpecialRemarkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      try {
        const { id } = await params;
        if (!ignore) {
          setReportId(id);
        }
        const nextReport = await fetchReport(id);
        if (!ignore) {
          setReport(nextReport);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "특이사항을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      ignore = true;
    };
  }, [params]);

  useEffect(() => {
    if (!report || !report.gps_info) {
      return;
    }

    const { latitude, longitude } = report.gps_info;
    let ignore = false;

    async function loadAddress() {
      setLoadingAddress(true);
      try {
        const response = await fetch(
          `/api/kakao/reverse-geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`
        );
        const payload = await response.json();
        if (!ignore && response.ok && payload.address) {
          setAddress(payload.address);
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);
      } finally {
        if (!ignore) {
          setLoadingAddress(false);
        }
      }
    }

    void loadAddress();

    return () => {
      ignore = true;
    };
  }, [report]);

  async function handleComplete() {
    if (!reportId || completing || deleting || report?.processing_status === "Y") return;
    if (!window.confirm("처리완료로 변경할까요?")) return;
    setCompleting(true);
    setError("");
    try {
      const response = await fetch(
        "/api/inspection/special-remarks/" + encodeURIComponent(reportId),
        { method: "PATCH" },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "처리상태를 변경하지 못했습니다.");
      setReport(payload.report);
      router.push("/manager/inspection/special-remarks");
      router.refresh();
    } catch (completionError) {
      setError(completionError instanceof Error ? completionError.message : "처리상태를 변경하지 못했습니다.");
    } finally {
      setCompleting(false);
    }
  }

  async function handleDelete() {
    if (!reportId || !window.confirm("특이사항 보고를 삭제하시겠습니까?")) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/inspection/special-remarks/${encodeURIComponent(reportId)}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "특이사항을 삭제하지 못했습니다.");
      }

      router.push("/manager/inspection/special-remarks");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "특이사항을 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">특이사항 상세</h1>
        <p className="mt-2 max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
          보고된 특이사항의 전체 내용과 첨부사진을 확인합니다.
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error && !report ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">{error}</p>
        ) : report ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[0.75rem] border border-border bg-background p-4">
                <p className="text-[0.8125rem] font-semibold text-muted-foreground">점검일시</p>
                <p className="mt-1 text-[1.0625rem] font-semibold">{formatDateTime(report.reported_at)}</p>
              </div>
              <div className="rounded-[0.75rem] border border-border bg-background p-4">
                <p className="text-[0.8125rem] font-semibold text-muted-foreground">점검자</p>
                <p className="mt-1 text-[1.0625rem] font-semibold">{report.employee_name}</p>
              </div>
              <div className="rounded-[0.75rem] border border-border bg-background p-4">
                <p className="text-[0.8125rem] font-semibold text-muted-foreground">보고 위치 (GPS)</p>
                <p className="mt-1 text-[1.0625rem] font-semibold">
                  {report.gps_info
                    ? address || (loadingAddress ? "주소 조회 중..." : `${report.gps_info.latitude.toFixed(6)}, ${report.gps_info.longitude.toFixed(6)}`)
                    : "기록 없음"}
                </p>
              </div>
            </div>

            <div className="rounded-[0.75rem] border border-border bg-background p-4">
              <p className="text-[0.8125rem] font-semibold text-muted-foreground">특이사항내용</p>
              <p className="mt-3 whitespace-pre-wrap text-[1rem] leading-relaxed">{report.content}</p>
            </div>

            <div className="rounded-[0.75rem] border border-border bg-background p-4">
              <p className="text-[0.8125rem] font-semibold text-muted-foreground">첨부사진</p>
              {report.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="첨부사진" className="mt-3 max-h-[70vh] w-full rounded-[0.75rem] object-contain" src={report.photo_url} />
              ) : (
                <p className="mt-3 text-muted-foreground">첨부사진이 없습니다.</p>
              )}
            </div>

            {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

            <div className="rounded-[0.75rem] border border-border bg-background p-4">
              <p className="text-[0.8125rem] font-semibold text-muted-foreground">처리상태</p>
              <p className="mt-2 text-[1rem] font-semibold">{report.processing_status === "Y" ? "처리완료" : "미처리"}</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button hidden={report.processing_status === "Y"} disabled={completing || deleting} onClick={handleComplete} type="button">
                {completing ? "처리 중..." : "처리완료"}
              </Button>
              <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50" disabled={deleting || completing} onClick={handleDelete} type="button" variant="outline">
                삭제
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
