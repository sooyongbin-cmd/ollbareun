"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type SystemConfig = {
  system_code: string;
  parent_system_code: string | null;
  description: string | null;
  content: string;
};

async function fetchConfigs() {
  const response = await fetch("/api/system/configs");
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "시스템설정을 불러오지 못했습니다.");
  }

  return (payload.configs ?? []) as SystemConfig[];
}

export default function SystemConfigsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    fetchConfigs()
      .then((nextConfigs) => {
        if (!ignore) {
          setConfigs(nextConfigs);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "시스템설정을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">시스템설정</h1>
        <p className="mt-2 max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
          시스템에서 사용하는 코드와 내용을 관리합니다.
        </p>
      </header>

      <section aria-label="시스템설정 조회" className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <div className="flex justify-end">
          <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50" href="/manager/system/configs/new">
            등록
          </Link>
        </div>
      </section>

      <section aria-label="시스템설정 목록" className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {configs.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">설명</TableHead>
                  <TableHead className="text-left">내용</TableHead>
                  <TableHead className="text-left">시스템코드</TableHead>
                  <TableHead className="text-left">상위시스템코드</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={4} className="p-8 text-center text-muted-foreground italic">
                      등록된 시스템설정이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  configs.map((config) => (
                    <TableRow key={config.system_code} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="설명" className="max-w-[22.5rem] whitespace-pre-wrap font-semibold">
                        <Link className="text-primary hover:opacity-80" href={`/manager/system/configs/${encodeURIComponent(config.system_code)}`}>
                          {config.description ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell data-label="내용" className="max-w-[32.5rem] whitespace-pre-wrap">{config.content}</TableCell>
                      <TableCell data-label="시스템코드" className="font-semibold">{config.system_code}</TableCell>
                      <TableCell data-label="상위시스템코드">{config.parent_system_code ?? "-"}</TableCell>
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
