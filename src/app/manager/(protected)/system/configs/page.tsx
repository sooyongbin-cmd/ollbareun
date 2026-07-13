"use client";

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
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">시스템설정</h1>
        <p className="mt-2 max-w-[640px] text-[21px] font-normal text-ink-muted-48">
          시스템에서 사용하는 코드와 내용을 관리합니다.
        </p>
      </header>

      <section aria-label="시스템설정 조회" className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <div className="flex justify-end">
          <Link className="button-primary" href="/manager/system/configs/new">
            등록
          </Link>
        </div>
      </section>

      <section aria-label="시스템설정 목록" className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="status-warn text-center">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">시스템코드</th>
                  <th className="text-left">상위시스템코드</th>
                  <th className="text-left">내용</th>
                  <th className="text-left">설명</th>
                </tr>
              </thead>
              <tbody>
                {configs.length === 0 ? (
                  <tr>
                    <td data-responsive-empty colSpan={4} className="p-8 text-center text-ink-muted-48 italic">
                      등록된 시스템설정이 없습니다.
                    </td>
                  </tr>
                ) : (
                  configs.map((config) => (
                    <tr key={config.system_code} className="hover:bg-canvas-parchment transition-colors">
                      <td data-label="시스템코드" className="font-semibold">
                        <Link className="text-primary hover:opacity-80" href={`/manager/system/configs/${encodeURIComponent(config.system_code)}`}>
                          {config.system_code}
                        </Link>
                      </td>
                      <td data-label="상위시스템코드">{config.parent_system_code ?? "-"}</td>
                      <td data-label="내용" className="max-w-[520px] whitespace-pre-wrap">{config.content}</td>
                      <td data-label="설명" className="max-w-[360px] whitespace-pre-wrap">{config.description ?? "-"}</td>
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
