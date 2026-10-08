"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { SortableHeader } from "@/components/sortable-header";

type AssignmentRow = {
  id: string;
  start_date: string;
  end_date: string;
  employee_name: string;
  employee_role: "경비원" | "미화원" | "파견" | null;
  employee_work_style: "0" | "1" | "2" | null;
  worksite_name: string;
};

type AssignmentResponse = {
  assignments: AssignmentRow[];
  employeeNames: string[];
  worksiteNames: string[];
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

function formatWorkStyle(workStyle: AssignmentRow["employee_work_style"]) {
  if (workStyle === "0") return "일반근무";
  if (workStyle === "1") return "격일근무";
  if (workStyle === "2") return "야간근무";
  return "근무형태 없음";
}

export default function AssignmentManagementClient() {
  const searchParams = useSearchParams();
  const initialWorksite = searchParams?.get("worksite") ?? "";
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [worksiteNames, setWorksiteNames] = useState<string[]>([]);
  const [dateQuery, setDateQuery] = useState("");
  const [worksiteQuery, setWorksiteQuery] = useState(initialWorksite);
  const [nameQuery, setNameQuery] = useState("");
  const [sortKey, setSortKey] = useState<"date" | "worksite" | "name">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const employeeNameOptions = useMemo(() => {
    return Array.from(new Set(employeeNames)).sort((left, right) =>
      left.localeCompare(right, "ko-KR"),
    );
  }, [employeeNames]);

  const worksiteNameOptions = useMemo(() => {
    return Array.from(new Set(worksiteNames)).sort((left, right) =>
      left.localeCompare(right, "ko-KR"),
    );
  }, [worksiteNames]);

  useEffect(() => {
    let ignore = false;

    async function loadAssignments() {
      try {
        const data = await fetchJson<AssignmentResponse>("/api/assignments");
        if (!ignore) {
          setAssignments(data.assignments ?? []);
          setEmployeeNames(data.employeeNames ?? []);
          setWorksiteNames(data.worksiteNames ?? []);
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

  const filteredAssignments = useMemo(() => {
    const normalizedDate = dateQuery.trim();
    const normalizedName = nameQuery.trim().toLowerCase();
    const normalizedWorksite = worksiteQuery.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesDate =
        !normalizedDate ||
        (assignment.start_date <= normalizedDate && normalizedDate <= assignment.end_date);
      const matchesWorksite =
        !normalizedWorksite || assignment.worksite_name.toLowerCase().includes(normalizedWorksite);
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

  const handleSort = (key: "date" | "worksite" | "name") => {
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
          <h1 className="text-[1.75rem] leading-[1.2]">근무지배정</h1>
        </div>
      </header>

      <section
        aria-label="배정 검색"
        className="manager-section bg-muted/40 rounded-xl border border-border/50"
      >
        <div className="grid gap-4 md:grid-cols-[repeat(3,minmax(0,1fr))_max-content] md:items-end">
          <div className="flex flex-col gap-2">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-name-search">
              이름
            </label>
            <Input
              className="w-full"
              id="assignment-name-search"
              list="assignment-name-search-options"
              placeholder="이름을 입력하세요."
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
            />
            <datalist id="assignment-name-search-options">
              {employeeNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="assignment-worksite-search">
              근무지
            </label>
            <Input
              className="w-full"
              id="assignment-worksite-search"
              list="assignment-worksite-search-options"
              placeholder="근무지 이름을 입력하세요."
              value={worksiteQuery}
              onChange={(event) => setWorksiteQuery(event.target.value)}
            />
            <datalist id="assignment-worksite-search-options">
              {worksiteNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div className="flex flex-col gap-2">
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
          <Link
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:w-auto"
            href="/manager/employee/assignments/new"
          >
            <span>배정등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="배정 목록"
        className="manager-section bg-muted/40 rounded-xl border border-border/50"
      >
        <div className="flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
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
                    sortKey="name"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    이름
                  </SortableHeader>
                  <TableHead>직군</TableHead>
                  <TableHead>근무형태</TableHead>
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
                    sortKey="date"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    날짜
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      조회 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell data-label="이름" className="text-muted-foreground">
                        <Link
                          className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50"
                          href={`/manager/employee/assignments/save/${assignment.id}`}
                        >
                          {assignment.employee_name}
                        </Link>
                      </TableCell>
                      <TableCell data-label="직군" className="text-muted-foreground">{assignment.employee_role ?? "직군 없음"}</TableCell>
                      <TableCell data-label="근무형태" className="whitespace-nowrap text-muted-foreground">
                        {formatWorkStyle(assignment.employee_work_style)}
                      </TableCell>
                      <TableCell data-label="근무지" className="text-muted-foreground">{assignment.worksite_name}</TableCell>
                      <TableCell data-label="날짜" className="font-semibold text-muted-foreground">{formatPeriod(assignment)}</TableCell>
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
