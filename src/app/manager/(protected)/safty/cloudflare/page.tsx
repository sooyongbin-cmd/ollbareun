"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";

type CloudflareVideoRow = {
  uid: string;
  title: string;
  status: string;
  pctComplete: string | null;
  uploaded: string | null;
  size: number | null;
  duration: number | null;
  readyToStream: boolean;
};

function formatBytes(bytes: number | null) {
  if (bytes === null) {
    return "-";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusText(video: CloudflareVideoRow) {
  if (video.readyToStream) {
    return "시청 가능";
  }

  if (video.status === "inprogress" && video.pctComplete) {
    return `처리 중 ${video.pctComplete}%`;
  }

  return video.status;
}

export default function CloudflareVideosPage() {
  const [videos, setVideos] = useState<CloudflareVideoRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadVideos() {
      try {
        const response = await fetch("/api/education/cloudflare/videos");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Cloudflare 동영상 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setVideos(payload.videos ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Cloudflare 동영상 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadVideos();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredVideos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return videos;
    }

    return videos.filter(
      (video) =>
        video.title.toLowerCase().includes(normalizedQuery) || video.uid.toLowerCase().includes(normalizedQuery),
    );
  }, [query, videos]);

  return (
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">교육자료(cloudflare)목록</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            Cloudflare Stream에 등록된 안전교육 동영상을 조회하고 시청합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="교육자료 cloudflare 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="cloudflare-search">
              제목 또는 UID
            </label>
            <input
              className="field"
              id="cloudflare-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="동영상 제목 또는 UID를 입력하세요."
            />
          </div>

          <Link className="button-primary w-full text-center md:w-auto gap-2" href="/manager/safty/cloudflare/new">
            <span>등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="교육자료 cloudflare 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 동영상 {videos.length}</span>
          <span>조회 결과 {filteredVideos.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 text-[16px] text-status-warn">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">제목/UID</th>
                  <th className="text-left">상태</th>
                  <th className="text-left">업로드일</th>
                  <th className="text-left">크기</th>
                  <th className="text-left">시청</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 Cloudflare 동영상이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredVideos.map((video) => (
                    <tr key={video.uid} className="hover:bg-canvas-parchment transition-colors">
                      <td>
                        <Link
                          className="font-semibold text-primary hover:underline"
                          href={`/manager/safty/cloudflare/watch/${video.uid}`}
                        >
                          {video.title}
                        </Link>
                        <div className="mt-1 text-[12px] text-ink-muted-48">{video.uid}</div>
                      </td>
                      <td className="font-semibold text-ink-muted-80">{getStatusText(video)}</td>
                      <td className="text-ink-muted-48">{formatDate(video.uploaded)}</td>
                      <td className="text-ink-muted-48">{formatBytes(video.size)}</td>
                      <td>
                        <Link
                          className="text-primary font-semibold hover:underline"
                          href={`/manager/safty/cloudflare/watch/${video.uid}`}
                        >
                          시청
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
