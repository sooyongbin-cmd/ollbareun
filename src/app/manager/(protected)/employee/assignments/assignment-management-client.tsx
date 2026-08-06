"use client";

import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { SortableHeader } from "@/components/sortable-header";

type AssignmentRow = {
  id: string;
  start_date: string;
  end_date: string;
  employee_name: string;
  worksite_name: string;
  days_off_count?: number;
};

type AssignmentResponse = {
  assignments: AssignmentRow[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "배정 목록을 불러오지 못했습니다.");
  }

  return payload as T;
}

function formatPeriod(assignment: AssignmentRow) {
  return assignment.start_date === assignment.end_date
    ? assignment.start_date
    : `${assignment.start_date} ~ ${assignment.end_date}`;
}

export default function AssignmentManagementClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorksite = searchParams?.get("worksite") ?? "";
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [dateQuery, setDateQuery] = useState("");
  const [worksiteQuery, setWorksiteQuery] = useState(initialWorksite);
  const [nameQuery, setNameQuery] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "worksite" | "name" | "daysOff">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadAssignments() {
      try {
        const data = await fetchJson<AssignmentResponse>("/api/assignments");
        if (!ignore) {
          setAssignments(data.assignments ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "배정 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      ignore = true;
    };
  }, []);

  const worksiteOptions = useMemo(() => {
    const names = new Set(assignments.map((assignment) => assignment.worksite_name));
    if (initialWorksite) {
      names.add(initialWorksite);
    }
    return Array.from(names).sort((left, right) => left.localeCompare(right, "ko-KR"));
  }, [assignments, initialWorksite]);

  const filteredAssignments = useMemo(() => {
    const normalizedDate = dateQuery.trim();
    const normalizedName = nameQuery.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesDate =
        !normalizedDate ||
        (assignment.start_date <= normalizedDate && normalizedDate <= assignment.end_date);
      const matchesWorksite = !worksiteQuery || assignment.worksite_name === worksiteQuery;
      const matchesName =
        !normalizedName || assignment.employee_name.toLowerCase().includes(normalizedName);

      return matchesDate && matchesWorksite && matchesName;
    });
  }, [assignments, dateQuery, nameQuery, worksiteQuery]);

  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((left, right) => {
      if (sortKey === "date") {
        if (left.start_date === right.start_date) {
          return left.employee_name.localeCompare(right.employee_name, "ko-KR");
        }
        return sortDirection === "asc"
          ? left.start_date.localeCompare(right.start_date)
          : right.start_date.localeCompare(left.start_date);
      } else if (sortKey === "worksite") {
        if (left.worksite_name === right.worksite_name) {
          return left.start_date.localeCompare(right.start_date);
        }
        return sortDirection === "asc"
          ? left.worksite_name.localeCompare(right.worksite_name, "ko-KR")
          : right.worksite_name.localeCompare(left.worksite_name, "ko-KR");
      } else if (sortKey === "daysOff") {
        const leftCount = left.days_off_count ?? 0;
        const rightCount = right.days_off_count ?? 0;
        if (leftCount === rightCount) {
          return left.start_date.localeCompare(right.start_date);
        }
        return sortDirection === "asc" ? leftCount - rightCount : rightCount - leftCount;
      } else {
        if (left.employee_name === right.employee_name) {
          return left.start_date.localeCompare(right.start_date);
        }
        return sortDirection === "asc"
          ? left.employee_name.localeCompare(right.employee_name, "ko-KR")
          : right.employee_name.localeCompare(left.employee_name, "ko-KR");
      }
    });
  }, [filteredAssignments, sortKey, sortDirection]);

  const handleSort = (key: "date" | "worksite" | "name" | "daysOff") => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  function openEditPage(assignmentId: string) {
    router.push(`/manager/employee/assignments/save/${assignmentId}`);
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">근무지배정</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            날짜, 근무지, 이름으로 배정 현황을 확인하고 필요하면 수정합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="배정 검색"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-4 flex-1 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-date-search">
                날짜
              </label>
              <Input
                className="w-full"
                id="assignment-date-search"
                type="date"
                value={dateQuery}
                onChange={(event) => setDateQuery(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-worksite-search">
                근무지
              </label>
              <NativeSelect
                className="w-full"
                id="assignment-worksite-search"
                value={worksiteQuery}
                onChange={(event) => setWorksiteQuery(event.target.value)}
              >
                <NativeSelectOption value="">전체</NativeSelectOption>
                {worksiteOptions.map((worksite) => (
                  <NativeSelectOption key={worksite} value={worksite}>
                    {worksite}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-name-search">
                이름
              </label>
              <Input
                className="w-full"
                id="assignment-name-search"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                placeholder="직원 이름 입력"
              />
            </div>
          </div>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full text-center md:w-auto gap-2"
            href="/manager/employee/assignments/new"
          >
            <span>배정등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="배정 목록"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[0.875rem] text-muted-foreground">
          <span>전체 배정 {assignments.length}</span>
          <span>조회 결과 {filteredAssignments.length}</span>
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
                    sortKey="date"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    날짜
                  </SortableHeader>
                  <SortableHeader
                    sortKey="worksite"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    근무지
                  </SortableHeader>
                  <SortableHeader
                    sortKey="name"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    이름
                  </SortableHeader>
                  <SortableHeader
                    sortKey="daysOff"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    휴무
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={4} className="p-8 text-center text-muted-foreground italic">
                      조회 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAssignments.map((assignment) => (
                    <TableRow
                      key={assignment.id}
                      aria-label={assignment.employee_name}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => openEditPage(assignment.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openEditPage(assignment.id);
                        }
                      }}
                      role="link"
                      tabIndex={0}
                    >
                      <TableCell data-label="날짜" className="font-semibold">{formatPeriod(assignment)}</TableCell>
                      <TableCell data-label="근무지">{assignment.worksite_name}</TableCell>
                      <TableCell data-label="이름" className="text-muted-foreground">{assignment.employee_name}</TableCell>
                      <TableCell data-label="휴무">{`${assignment.days_off_count ?? 0}일`}</TableCell>
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
