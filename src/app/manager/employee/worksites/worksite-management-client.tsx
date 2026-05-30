"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatGpsInfo, type GpsInfo } from "@/lib/gps";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { SortableHeader } from "@/components/sortable-header";

type WorksiteRow = {
  id: string;
  name: string;
  gps_info: GpsInfo;
  radius_meters: number;
};

type AssignmentRow = {
  worksite_id: string;
};

type Bootstrap = {
  worksites: WorksiteRow[];
  assignments: AssignmentRow[];
};

const emptyBootstrap: Bootstrap = {
  worksites: [],
  assignments: [],
};

export default function WorksiteManagementClient() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get("worksite") ?? "";
  const [data, setData] = useState<Bootstrap>(emptyBootstrap);
  const [query, setQuery] = useState(initialQuery);
  const [sortKey, setSortKey] = useState<"name" | "count" | "radius">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadBootstrap() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "근무지 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setData({
            worksites: payload.worksites ?? [],
            assignments: payload.assignments ?? [],
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "근무지 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  const worksiteCounts = useMemo(() => {
    return data.assignments.reduce<Record<string, number>>((counts, assignment) => {
      counts[assignment.worksite_id] = (counts[assignment.worksite_id] ?? 0) + 1;
      return counts;
    }, {});
  }, [data.assignments]);

  const filteredWorksites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return data.worksites;
    }

    return data.worksites.filter((worksite) => worksite.name.toLowerCase().includes(normalizedQuery));
  }, [data.worksites, query]);

  const sortedWorksites = useMemo(() => {
    return [...filteredWorksites].sort((left, right) => {
      if (sortKey === "name") {
        return sortDirection === "asc"
          ? left.name.localeCompare(right.name, "ko-KR")
          : right.name.localeCompare(left.name, "ko-KR");
      } else if (sortKey === "count") {
        const leftCount = worksiteCounts[left.id] ?? 0;
        const rightCount = worksiteCounts[right.id] ?? 0;
        if (leftCount === rightCount) {
          return left.name.localeCompare(right.name, "ko-KR");
        }
        return sortDirection === "asc" ? leftCount - rightCount : rightCount - leftCount;
      } else {
        if (left.radius_meters === right.radius_meters) {
          return left.name.localeCompare(right.name, "ko-KR");
        }
        return sortDirection === "asc"
          ? left.radius_meters - right.radius_meters
          : right.radius_meters - left.radius_meters;
      }
    });
  }, [filteredWorksites, sortKey, sortDirection, worksiteCounts]);

  const handleSort = (key: "name" | "count" | "radius") => {
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
          <h1 className="text-[40px] font-semibold leading-[1.1]">근무지관리</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            등록된 근무지를 검색하고 배정 현황을 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="근무지 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-search">
              근무지
            </label>
            <input
              className="field"
              id="worksite-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="근무지 이름을 입력하세요."
            />
          </div>

          <Link
            className="button-primary w-full text-center md:w-auto gap-2"
            href="/manager/employee/worksites/new"
          >
            <span>근무지 등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="근무지 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 근무지 {data.worksites.length}</span>
          <span>검색 결과 {filteredWorksites.length}</span>
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
                    sortKey="name"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    근무지명
                  </SortableHeader>
                  <SortableHeader
                    sortKey="count"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-center"
                  >
                    배정인원수
                  </SortableHeader>
                  <th className="text-left">GPS정보</th>
                  <SortableHeader
                    sortKey="radius"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right"
                  >
                    허용반경
                  </SortableHeader>
                </tr>
              </thead>
              <tbody>
                {sortedWorksites.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 근무지가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedWorksites.map((worksite) => {
                    const count = worksiteCounts[worksite.id] ?? 0;
                    return (
                      <tr key={worksite.id} className="hover:bg-canvas-parchment transition-colors">
                        <td className="font-semibold">
                          <Link
                            className="text-primary hover:underline"
                            href={`/manager/employee/worksites/save/${worksite.id}`}
                          >
                            {worksite.name}
                          </Link>
                        </td>
                        <td className="text-center">
                          {count > 0 ? (
                            <Link
                              className="text-primary font-semibold hover:underline"
                              href={`/manager/employee/assignments?worksite=${encodeURIComponent(worksite.name)}`}
                            >
                              {count}
                            </Link>
                          ) : (
                            <span className="text-ink-muted-48">{count}</span>
                          )}
                        </td>
                        <td className="text-ink-muted-48">{formatGpsInfo(worksite.gps_info)}</td>
                        <td className="text-right">{worksite.radius_meters}m</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
