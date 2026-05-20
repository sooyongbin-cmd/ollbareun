"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AssignmentRow = {
  id: string;
  work_date: string;
  employee_name: string;
  worksite_name: string;
};

type AssignmentResponse = {
  assignments: AssignmentRow[];
};

const emptyAssignments: AssignmentRow[] = [];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "배정 목록을 불러오지 못했습니다.");
  }

  return payload as T;
}

function formatDate(value: string) {
  return value ? value : "-";
}

export default function AssignmentManagementPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<AssignmentRow[]>(emptyAssignments);
  const [dateQuery, setDateQuery] = useState("");
  const [worksiteQuery, setWorksiteQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
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
      const matchesDate = !normalizedDate || assignment.work_date.includes(normalizedDate);
      const matchesWorksite =
        !normalizedWorksite || assignment.worksite_name.toLowerCase().includes(normalizedWorksite);
      const matchesName =
        !normalizedName || assignment.employee_name.toLowerCase().includes(normalizedName);

      return matchesDate && matchesWorksite && matchesName;
    });
  }, [assignments, dateQuery, nameQuery, worksiteQuery]);

  function openEditPage(assignmentId: string) {
    router.push(`/manager/employee/assignments/save/${assignmentId}`);
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <p className="text-[14px] font-semibold text-ink-muted-48 uppercase tracking-wider">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">근무지배정</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            날짜, 근무지, 이름으로 배정 현황을 확인하고 필요하면 수정합니다.
          </p>
        </div>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
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

          <Link className="button-primary w-full text-center md:w-auto" href="/manager/employee/assignments/new">
            배정하기
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 배정 {assignments.length}</span>
          <span>조회 결과 {filteredAssignments.length}</span>
        </div>

        {loading ? (
          <p className="mt-6 text-[16px] text-ink-muted-48">배정 목록을 불러오는 중입니다.</p>
        ) : error ? (
          <p className="mt-6 text-[16px] text-status-warn">{error}</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">날짜</th>
                  <th className="text-left">근무지</th>
                  <th className="text-left">이름</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((assignment) => (
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
                      <td className="font-semibold">{formatDate(assignment.work_date)}</td>
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
