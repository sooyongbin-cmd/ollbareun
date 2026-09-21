"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">교육자료(cloudflare)목록</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            Cloudflare Stream에 등록된 안전교육 동영상을 조회하고 시청합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="교육자료 cloudflare 검색"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="cloudflare-search">
              제목 또는 UID
            </label>
            <Input
              className="w-full"
              id="cloudflare-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="동영상 제목 또는 UID를 입력하세요."
            />
          </div>

          <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full text-center md:w-auto gap-2" href="/manager/safety/cloudflare/new">
            <span>등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="교육자료 cloudflare 목록"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {filteredVideos.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 text-[1rem] text-destructive">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">제목/UID</TableHead>
                  <TableHead className="text-left">상태</TableHead>
                  <TableHead className="text-left">업로드일</TableHead>
                  <TableHead className="text-left">크기</TableHead>
                  <TableHead className="text-left">시청</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVideos.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 Cloudflare 동영상이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVideos.map((video) => (
                    <TableRow key={video.uid} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="제목/UID">
                        <div>
                          <Link
                            className="font-semibold text-primary hover:underline"
                            href={`/manager/safety/cloudflare/watch/${video.uid}`}
                          >
                            {video.title}
                          </Link>
                          <div className="mt-1 text-[0.75rem] text-muted-foreground">{video.uid}</div>
                        </div>
                      </TableCell>
                      <TableCell data-label="상태" className="font-semibold text-foreground/80">{getStatusText(video)}</TableCell>
                      <TableCell data-label="업로드일" className="text-muted-foreground">{formatDate(video.uploaded)}</TableCell>
                      <TableCell data-label="크기" className="text-muted-foreground">{formatBytes(video.size)}</TableCell>
                      <TableCell data-label="시청">
                        <Link
                          className="text-primary font-semibold hover:underline"
                          href={`/manager/safety/cloudflare/watch/${video.uid}`}
                        >
                          시청
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </section>
  );
}
