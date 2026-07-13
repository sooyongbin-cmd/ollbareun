"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { SortableHeader } from "@/components/sortable-header";

type EducationResourceRow = {
  id: string;
  title: string;
  youtube_link: string;
  created_at: string;
};

type EducationCompletionRow = {
  employee_id: string;
  resource_id: string;
  is_completed: boolean;
};

type EmployeeRow = {
  id: string;
  is_retired: boolean;
};

export default function EducationResourcesPage() {
  const [resources, setResources] = useState<EducationResourceRow[]>([]);
  const [completions, setCompletions] = useState<EducationCompletionRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<"title" | "completions">("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadResources() {
      try {
        const [resourcesResponse, completionsResponse, bootstrapResponse] = await Promise.all([
          fetch("/api/education/resources"),
          fetch("/api/education/completions"),
          fetch("/api/bootstrap"),
        ]);
        const resourcesPayload = await resourcesResponse.json();
        const completionsPayload = await completionsResponse.json();
        const bootstrapPayload = await bootstrapResponse.json();

        if (!resourcesResponse.ok) {
          throw new Error(resourcesPayload.error ?? "교육자료 목록을 불러오지 못했습니다.");
        }
        if (!completionsResponse.ok) {
          throw new Error(completionsPayload.error ?? "교육이수 목록을 불러오지 못했습니다.");
        }
        if (!bootstrapResponse.ok) {
          throw new Error(bootstrapPayload.error ?? "직원 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setResources(resourcesPayload.resources ?? []);
          setCompletions(completionsPayload.completions ?? []);
          setEmployees(bootstrapPayload.employees ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "교육자료 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadResources();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return resources;
    }

    return resources.filter((resource) => resource.title.toLowerCase().includes(normalizedQuery));
  }, [query, resources]);

  const activeEmployeeIds = useMemo(() => {
    return new Set(employees.filter((employee) => !employee.is_retired).map((employee) => employee.id));
  }, [employees]);

  const completedEmployeeCountByResourceId = useMemo(() => {
    const completedEmployeesByResourceId = new Map<string, Set<string>>();

    completions.forEach((completion) => {
      if (!completion.is_completed || !activeEmployeeIds.has(completion.employee_id)) {
        return;
      }

      const employeeIds = completedEmployeesByResourceId.get(completion.resource_id) ?? new Set<string>();
      employeeIds.add(completion.employee_id);
      completedEmployeesByResourceId.set(completion.resource_id, employeeIds);
    });

    return completedEmployeesByResourceId;
  }, [activeEmployeeIds, completions]);

  const sortedResources = useMemo(() => {
    return [...filteredResources].sort((left, right) => {
      if (sortKey === "title") {
        return sortDirection === "asc"
          ? left.title.localeCompare(right.title, "ko-KR")
          : right.title.localeCompare(left.title, "ko-KR");
      } else {
        const leftCount = completedEmployeeCountByResourceId.get(left.id)?.size ?? 0;
        const rightCount = completedEmployeeCountByResourceId.get(right.id)?.size ?? 0;
        if (leftCount === rightCount) {
          return left.title.localeCompare(right.title, "ko-KR");
        }
        return sortDirection === "asc" ? leftCount - rightCount : rightCount - leftCount;
      }
    });
  }, [filteredResources, sortKey, sortDirection, completedEmployeeCountByResourceId]);

  const handleSort = (key: "title" | "completions") => {
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
          <h1 className="text-[40px] font-semibold leading-[1.1]">교육자료관리</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            안전교육 교재 유튜브 링크를 등록하고 조회합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="교육자료 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="resource-search">
              제목
            </label>
            <input
              className="field"
              id="resource-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="교육자료 제목을 입력하세요."
            />
          </div>

          <Link
            className="button-primary w-full text-center md:w-auto gap-2"
            href="/manager/safty/resources/new"
          >
            <span>교재등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="교육자료 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 교육자료 {resources.length}</span>
          <span>검색 결과 {filteredResources.length}</span>
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
                  <SortableHeader
                    sortKey="title"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    제목
                  </SortableHeader>
                  <th className="text-left">유튜브 링크</th>
                  <SortableHeader
                    sortKey="completions"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    이수현황
                  </SortableHeader>
                </tr>
              </thead>
              <tbody>
                {sortedResources.length === 0 ? (
                  <tr>
                    <td data-responsive-empty colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 교육자료가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedResources.map((resource) => (
                    <tr key={resource.id} className="hover:bg-canvas-parchment transition-colors">
                      <td data-label="제목" className="font-semibold">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/safty/resources/save/${resource.id}`}
                        >
                          {resource.title}
                        </Link>
                      </td>
                      <td data-label="유튜브 링크" className="text-ink-muted-48">
                        <a
                          className="underline-offset-4 hover:underline"
                          href={resource.youtube_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {resource.youtube_link}
                        </a>
                      </td>
                      <td data-label="이수현황" className="font-semibold text-ink-muted-80">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/safty/completions/detail?resourceId=${encodeURIComponent(resource.id)}`}
                        >
                          {completedEmployeeCountByResourceId.get(resource.id)?.size ?? 0}/{activeEmployeeIds.size}
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
