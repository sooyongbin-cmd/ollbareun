"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { type GpsInfo } from "@/lib/gps";
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
  const [addresses, setAddresses] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    const coordinates = new Map<string, GpsInfo>();
    for (const worksite of data.worksites) {
      const gps = worksite.gps_info;
      if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
        coordinates.set(`${gps.latitude},${gps.longitude}`, gps);
      }
    }
    async function loadAddresses() {
      for (const [key, gps] of coordinates) {
        if (controller.signal.aborted) return;
        let address = "주소를 조회하지 못했습니다.";
        try {
          const params = new URLSearchParams({ lat: String(gps.latitude), lng: String(gps.longitude) });
          const response = await fetch(`/api/kakao/reverse-geocode?${params}`, { signal: controller.signal });
          const payload = await response.json();
          if (response.ok) address = payload.address || "주소 정보 없음";
        } catch {
          // Keep each lookup failure local to its address cell.
        }
        if (!controller.signal.aborted) setAddresses((current) => ({ ...current, [key]: address }));
      }
    }
    void loadAddresses();
    return () => controller.abort();
  }, [data.worksites]);

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

  const worksiteNameOptions = useMemo(() => {
    return Array.from(new Set(data.worksites.map((worksite) => worksite.name))).sort((left, right) =>
      left.localeCompare(right, "ko-KR"),
    );
  }, [data.worksites]);

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
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">근무지관리</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            등록된 근무지를 검색하고 배정 현황을 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="근무지 검색"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-search">
              근무지
            </label>
            <Input
              className="w-full"
              id="worksite-search"
              list="worksite-search-options"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="근무지 이름을 입력하세요."
            />
            <datalist id="worksite-search-options">
              {worksiteNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full text-center md:w-auto gap-2"
            href="/manager/employee/worksites/new"
          >
            <span>근무지 등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="근무지 목록"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[0.875rem] text-muted-foreground">
          <span>전체 근무지 {data.worksites.length}</span>
          <span>검색 결과 {filteredWorksites.length}</span>
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
                  <TableHead className="text-left">주소</TableHead>
                  <SortableHeader
                    sortKey="radius"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right"
                  >
                    허용반경
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedWorksites.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={4} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 근무지가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedWorksites.map((worksite) => {
                    const count = worksiteCounts[worksite.id] ?? 0;
                    return (
                      <TableRow key={worksite.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell data-label="근무지명" className="font-semibold">
                          <Link
                            className="text-primary hover:underline"
                            href={`/manager/employee/worksites/save/${worksite.id}`}
                          >
                            {worksite.name}
                          </Link>
                        </TableCell>
                        <TableCell data-label="배정인원수" className="text-center">
                          {count > 0 ? (
                            <Link
                              className="text-primary font-semibold hover:underline"
                              href={`/manager/employee/assignments?worksite=${encodeURIComponent(worksite.name)}`}
                            >
                              {count}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{count}</span>
                          )}
                        </TableCell>
                        <TableCell data-label="주소" className="text-muted-foreground whitespace-normal break-words">
                          {worksite.gps_info && Number.isFinite(worksite.gps_info.latitude) && Number.isFinite(worksite.gps_info.longitude)
                            ? addresses[`${worksite.gps_info.latitude},${worksite.gps_info.longitude}`] ?? "주소 조회 중…"
                            : "-"}
                        </TableCell>
                        <TableCell data-label="허용반경" className="text-right text-muted-foreground">{worksite.radius_meters}m</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </section>
  );
}
