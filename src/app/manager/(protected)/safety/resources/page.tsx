"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">교육자료관리</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            안전교육 교재 유튜브 링크를 등록하고 조회합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="교육자료 검색"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="resource-search">
              제목
            </label>
            <Input
              className="w-full"
              id="resource-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="교육자료 제목을 입력하세요."
            />
          </div>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full text-center md:w-auto gap-2"
            href="/manager/safety/resources/new"
          >
            <span>교재등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="교육자료 목록"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[0.875rem] text-muted-foreground">
          <span>전체 교육자료 {resources.length}</span>
          <span>검색 결과 {filteredResources.length}</span>
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
                  <SortableHeader
                    sortKey="title"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    제목
                  </SortableHeader>
                  <TableHead className="text-left">유튜브 링크</TableHead>
                  <SortableHeader
                    sortKey="completions"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    이수현황
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResources.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={3} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 교육자료가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedResources.map((resource) => (
                    <TableRow key={resource.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="제목" className="font-semibold">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/safety/resources/save/${resource.id}`}
                        >
                          {resource.title}
                        </Link>
                      </TableCell>
                      <TableCell data-label="유튜브 링크" className="text-muted-foreground">
                        <a
                          className="underline-offset-4 hover:underline"
                          href={resource.youtube_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {resource.youtube_link}
                        </a>
                      </TableCell>
                      <TableCell data-label="이수현황" className="font-semibold text-foreground/80">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/safety/completions/detail?resourceId=${encodeURIComponent(resource.id)}`}
                        >
                          {completedEmployeeCountByResourceId.get(resource.id)?.size ?? 0}/{activeEmployeeIds.size}
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
