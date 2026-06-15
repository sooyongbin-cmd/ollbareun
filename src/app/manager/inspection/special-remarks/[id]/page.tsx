"use client";

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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

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
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">특이사항 상세</h1>
        <p className="mt-2 max-w-[640px] text-[21px] font-normal text-ink-muted-48">
          보고된 특이사항의 전체 내용과 첨부사진을 확인합니다.
        </p>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error && !report ? (
          <p className="status-warn text-center">{error}</p>
        ) : report ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[12px] border border-hairline bg-canvas p-4">
                <p className="text-[13px] font-semibold text-ink-muted-48">점검일시</p>
                <p className="mt-1 text-[17px] font-semibold">{formatDateTime(report.reported_at)}</p>
              </div>
              <div className="rounded-[12px] border border-hairline bg-canvas p-4">
                <p className="text-[13px] font-semibold text-ink-muted-48">점검자</p>
                <p className="mt-1 text-[17px] font-semibold">{report.employee_name}</p>
              </div>
              <div className="rounded-[12px] border border-hairline bg-canvas p-4">
                <p className="text-[13px] font-semibold text-ink-muted-48">보고 위치 (GPS)</p>
                <p className="mt-1 text-[17px] font-semibold">
                  {report.gps_info
                    ? `${report.gps_info.latitude.toFixed(6)}, ${report.gps_info.longitude.toFixed(6)}`
                    : "기록 없음"}
                </p>
              </div>
            </div>

            <div className="rounded-[12px] border border-hairline bg-canvas p-4">
              <p className="text-[13px] font-semibold text-ink-muted-48">특이사항내용</p>
              <p className="mt-3 whitespace-pre-wrap text-[16px] leading-relaxed">{report.content}</p>
            </div>

            <div className="rounded-[12px] border border-hairline bg-canvas p-4">
              <p className="text-[13px] font-semibold text-ink-muted-48">첨부사진</p>
              {report.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="첨부사진" className="mt-3 max-h-[70vh] w-full rounded-[12px] object-contain" src={report.photo_url} />
              ) : (
                <p className="mt-3 text-ink-muted-48">첨부사진이 없습니다.</p>
              )}
            </div>

            {error ? <p className="status-warn">{error}</p> : null}

            <div className="flex justify-end">
              <button className="button-secondary" disabled={deleting} onClick={handleDelete} type="button">
                삭제
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
