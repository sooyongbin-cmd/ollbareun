"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type EducationCompletionRow = {
  employee_id: string;
  employee_name: string;
  resource_id: string;
  resource_title: string;
  resource_youtube_link: string;
  is_completed: boolean;
  completed_at: string | null;
};

type EducationResourceRow = {
  id: string;
  title: string;
};

function readResourceIdFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("resourceId") ?? "";
}

function subscribeToLocationChange(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

export default function EducationCompletionsPage() {
  const [completions, setCompletions] = useState<EducationCompletionRow[]>([]);
  const [resources, setResources] = useState<EducationResourceRow[]>([]);
  const resourceIdFromUrl = useSyncExternalStore(subscribeToLocationChange, readResourceIdFromLocation, () => "");
  const [selectedResourceIdOverride, setSelectedResourceIdOverride] = useState<string | null>(null);
  const selectedResourceId = selectedResourceIdOverride ?? resourceIdFromUrl;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadCompletions() {
      try {
        const [completionsResponse, resourcesResponse] = await Promise.all([
          fetch("/api/education/completions"),
          fetch("/api/education/resources"),
        ]);
        const completionsPayload = await completionsResponse.json();
        const resourcesPayload = await resourcesResponse.json();

        if (!completionsResponse.ok) {
          throw new Error(completionsPayload.error ?? "교육이수 목록을 불러오지 못했습니다.");
        }
        if (!resourcesResponse.ok) {
          throw new Error(resourcesPayload.error ?? "교육자료 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setCompletions(completionsPayload.completions ?? []);
          setResources(resourcesPayload.resources ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "교육이수 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadCompletions();

    return () => {
      ignore = true;
    };
  }, []);

  const resourceOptions = useMemo(() => {
    const resourceById = new Map<string, string>();

    resources.forEach((resource) => {
      resourceById.set(resource.id, resource.title);
    });

    completions.forEach((completion) => {
      if (!resourceById.has(completion.resource_id)) {
        resourceById.set(completion.resource_id, completion.resource_title);
      }
    });

    return [...resourceById.entries()].sort((left, right) => left[1].localeCompare(right[1], "ko-KR"));
  }, [completions, resources]);

  const filteredCompletions = useMemo(() => {
    if (!selectedResourceId) {
      return completions;
    }

    return completions.filter((completion) => completion.resource_id === selectedResourceId);
  }, [completions, selectedResourceId]);

  return (
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">교육이수관리</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            직원별 교육이수 현황을 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="교육이수 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="completion-resource-search">
              교재
            </label>
            <select
              className="field"
              id="completion-resource-search"
              value={selectedResourceId}
              onChange={(event) => setSelectedResourceIdOverride(event.target.value)}
            >
              <option value="">전체</option>
              {resourceOptions.map(([resourceId, resourceTitle]) => (
                <option key={resourceId} value={resourceId}>
                  {resourceTitle}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section
        aria-label="교육이수 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 이수 기록 {completions.length}</span>
          <span>검색 결과 {filteredCompletions.length}</span>
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
                  <th className="text-left">직원</th>
                  <th className="text-left">교재</th>
                  <th className="text-left">완료여부</th>
                  <th className="text-left">완료일자</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompletions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 교육이수 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredCompletions.map((completion) => (
                    <tr key={`${completion.employee_id}:${completion.resource_id}`} className="hover:bg-canvas-parchment transition-colors">
                      <td className="font-semibold">{completion.employee_name}</td>
                      <td className="text-ink-muted-48">
                        <div className="space-y-1">
                          <div>{completion.resource_title}</div>
                          {completion.resource_youtube_link ? (
                            <a
                              className="text-[12px] underline-offset-4 hover:underline"
                              href={completion.resource_youtube_link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {completion.resource_youtube_link}
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
                            completion.is_completed ? "bg-primary/10 text-primary" : "bg-ink/10 text-ink-muted-48"
                          }`}
                        >
                          {completion.is_completed ? "완료" : "미완료"}
                        </span>
                      </td>
                      <td className="text-ink-muted-48">
                        {completion.completed_at
                          ? new Date(completion.completed_at).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
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
