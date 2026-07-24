"use client";

import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import ManagerLoadingMessage from "../../../manager-loading-message";
import { SortableHeader } from "@/components/sortable-header";

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

function readNameFromLocation() {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("name") ?? "";
}

function subscribeToLocationChange(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

export default function EducationCompletionsDetailPage() {
  const [completions, setCompletions] = useState<EducationCompletionRow[]>([]);
  const [resources, setResources] = useState<EducationResourceRow[]>([]);
  const resourceIdFromUrl = useSyncExternalStore(subscribeToLocationChange, readResourceIdFromLocation, () => "");
  const [selectedResourceIdOverride, setSelectedResourceIdOverride] = useState<string | null>(null);
  const selectedResourceId = selectedResourceIdOverride ?? resourceIdFromUrl;

  const nameFromUrl = useSyncExternalStore(subscribeToLocationChange, readNameFromLocation, () => "");
  const [nameQueryOverride, setNameQueryOverride] = useState<string | null>(null);
  const nameQuery = nameQueryOverride ?? nameFromUrl;

  const [sortKey, setSortKey] = useState<"employee_name" | "resource_title" | "is_completed" | "completed_at">("employee_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
    const normalizedNameQuery = nameQuery.trim().toLowerCase();

    return completions.filter((completion) => {
      const matchesResource = !selectedResourceId || completion.resource_id === selectedResourceId;
      const matchesName = !normalizedNameQuery || completion.employee_name.toLowerCase().includes(normalizedNameQuery);

      return matchesResource && matchesName;
    });
  }, [completions, selectedResourceId, nameQuery]);

  const sortedCompletions = useMemo(() => {
    return [...filteredCompletions].sort((left, right) => {
      if (sortKey === "employee_name") {
        return sortDirection === "asc"
          ? left.employee_name.localeCompare(right.employee_name, "ko-KR")
          : right.employee_name.localeCompare(left.employee_name, "ko-KR");
      } else if (sortKey === "resource_title") {
        return sortDirection === "asc"
          ? left.resource_title.localeCompare(right.resource_title, "ko-KR")
          : right.resource_title.localeCompare(left.resource_title, "ko-KR");
      } else if (sortKey === "is_completed") {
        const leftVal = left.is_completed ? 1 : 0;
        const rightVal = right.is_completed ? 1 : 0;
        return sortDirection === "asc" ? leftVal - rightVal : rightVal - leftVal;
      } else {
        const leftVal = left.completed_at ? new Date(left.completed_at).getTime() : 0;
        const rightVal = right.completed_at ? new Date(right.completed_at).getTime() : 0;
        return sortDirection === "asc" ? leftVal - rightVal : rightVal - leftVal;
      }
    });
  }, [filteredCompletions, sortKey, sortDirection]);

  const handleSort = (key: "employee_name" | "resource_title" | "is_completed" | "completed_at") => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">교육이수상세</h1>
          <p className="text-[21px] font-normal text-muted-foreground max-w-[640px]">
            직원별 교육이수 현황을 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="교육이수 검색"
        className="bg-muted/40 rounded-xl p-[32px] border border-border/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <div className="space-y-2 flex-1">
              <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="completion-resource-search">
                교재
              </label>
              <NativeSelect
                className="w-full"
                id="completion-resource-search"
                value={selectedResourceId}
                onChange={(event) => setSelectedResourceIdOverride(event.target.value)}
              >
                <NativeSelectOption value="">전체</NativeSelectOption>
                {resourceOptions.map(([resourceId, resourceTitle]) => (
                  <NativeSelectOption key={resourceId} value={resourceId}>
                    {resourceTitle}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="completion-name-search">
                직원 이름
              </label>
              <Input
                className="w-full"
                id="completion-name-search"
                value={nameQuery}
                onChange={(event) => setNameQueryOverride(event.target.value)}
                placeholder="검색할 직원 이름을 입력하세요."
              />
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="교육이수 목록"
        className="bg-muted/40 rounded-xl p-[32px] border border-border/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-muted-foreground">
          <span>전체 이수 기록 {completions.length}</span>
          <span>검색 결과 {filteredCompletions.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 text-[16px] text-destructive">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    sortKey="employee_name"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    직원
                  </SortableHeader>
                  <SortableHeader
                    sortKey="resource_title"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    교재
                  </SortableHeader>
                  <SortableHeader
                    sortKey="is_completed"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    완료여부
                  </SortableHeader>
                  <SortableHeader
                    sortKey="completed_at"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    완료일자
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCompletions.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={4} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 교육이수 기록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCompletions.map((completion) => (
                    <TableRow key={`${completion.employee_id}:${completion.resource_id}`} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="직원" className="font-semibold">{completion.employee_name}</TableCell>
                      <TableCell data-label="교재" className="text-muted-foreground">
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
                      </TableCell>
                      <TableCell data-label="완료여부">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
                            completion.is_completed ? "bg-primary/10 text-primary" : "bg-foreground/10 text-muted-foreground"
                          }`}
                        >
                          {completion.is_completed ? "완료" : "미완료"}
                        </span>
                      </TableCell>
                      <TableCell data-label="완료일자" className="text-muted-foreground">
                        {completion.completed_at
                          ? new Date(completion.completed_at).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
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
