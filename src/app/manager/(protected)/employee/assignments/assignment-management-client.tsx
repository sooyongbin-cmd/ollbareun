"use client";

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
  const [sortKey, setSortKey] = useState<"date" | "worksite" | "name">("date");
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

  const filteredAssignments = useMemo(() => {
    const normalizedDate = dateQuery.trim();
    const normalizedWorksite = worksiteQuery.trim().toLowerCase();
    const normalizedName = nameQuery.trim().toLowerCase();

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

  function openEditPage(assignmentId: string) {
    router.push(`/manager/employee/assignments/save/${assignmentId}`);
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">근무지배정</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            날짜, 근무지, 이름으로 배정 현황을 확인하고 필요하면 수정합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="배정 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-4 flex-1 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-date-search">
                날짜
              </label>
              <input
                className="field"
                id="assignment-date-search"
                type="date"
                value={dateQuery}
                onChange={(event) => setDateQuery(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-worksite-search">
                근무지
              </label>
              <input
                className="field"
                id="assignment-worksite-search"
                value={worksiteQuery}
                onChange={(event) => setWorksiteQuery(event.target.value)}
                placeholder="근무지 이름 입력"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-name-search">
                이름
              </label>
              <input
                className="field"
                id="assignment-name-search"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
                placeholder="직원 이름 입력"
              />
            </div>
          </div>

          <Link
            className="button-primary w-full text-center md:w-auto gap-2"
            href="/manager/employee/assignments/new"
          >
            <span>배정등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="배정 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 배정 {assignments.length}</span>
          <span>조회 결과 {filteredAssignments.length}</span>
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
                </tr>
              </thead>
              <tbody>
                {sortedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedAssignments.map((assignment) => (
                    <tr
                      key={assignment.id}
                      aria-label={assignment.employee_name}
                      className="cursor-pointer hover:bg-canvas-parchment transition-colors"
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
                      <td className="font-semibold">{formatPeriod(assignment)}</td>
                      <td>{assignment.worksite_name}</td>
                      <td className="text-ink-muted-48">{assignment.employee_name}</td>
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
