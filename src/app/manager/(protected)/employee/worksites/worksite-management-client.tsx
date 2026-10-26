"use client";

import DetailModalLink from "@/components/modals/detail-modal-link";

import RegistrationModal from "@/components/modals/registration-modal";
import dynamic from "next/dynamic";

import ListResults from "@/components/list-results";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { SortableHeader } from "@/components/sortable-header";

type WorksiteRow = {
  id: string;
  name: string;
  address?: string | null;
  radius_meters: number;
};

type AssignmentRow = {
  worksite_id: string;
};

type Bootstrap = {
  worksites: WorksiteRow[];
  assignments: AssignmentRow[];
  inspectionSiteCounts: Record<string, number>;
};

const emptyBootstrap: Bootstrap = {
  worksites: [],
  assignments: [],
  inspectionSiteCounts: {},
};

const RegistrationForm = dynamic(() => import("./new/registration-form"));

export default function WorksiteManagementClient() {
  const [registrationVersion, setRegistrationVersion] = useState(0);
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
            inspectionSiteCounts: payload.inspectionSiteCounts ?? {},
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
  }, [registrationVersion]);

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
        </div>
      </header>

      <section
        aria-label="근무지 검색"
        className="manager-section bg-muted/40 rounded-xl border border-border/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-2">
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

          <RegistrationModal
            title="근무지등록"
            form={RegistrationForm}
            onSaved={() => {
              setError("");
              setLoading(true);
              setRegistrationVersion((version) => version + 1);
            }}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full text-center md:w-auto gap-2"
          >
            <span>근무지 등록</span>
            <ArrowRightIcon size={18} />
          </RegistrationModal>
        </div>
      </section>

      <section
        aria-label="근무지 목록"
        className="manager-section bg-muted/40 rounded-xl border border-border/50"
      >
        <div className="flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <ListResults count={filteredWorksites.length} disabled={loading || Boolean(error)} />
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
                    근무지
                  </SortableHeader>
                  <TableHead className="text-center">점검지</TableHead>
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
                    <TableCell data-responsive-empty colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 근무지가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedWorksites.map((worksite) => {
                    const count = worksiteCounts[worksite.id] ?? 0;
                    return (
                      <TableRow key={worksite.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell data-label="근무지" className="font-semibold">
                          <DetailModalLink onSaved={() => { setError(""); setLoading(true); setRegistrationVersion((version) => version + 1); }}
                            className="text-primary hover:underline"
                            href={`/manager/employee/worksites/save/${worksite.id}`}
                          >
                            {worksite.name}
                          </DetailModalLink>
                        </TableCell>
                        <TableCell data-label="점검지" className="text-center">
                          {(data.inspectionSiteCounts[worksite.id] ?? 0) > 0 ? (
                            <Link
                              className="text-primary font-semibold hover:underline"
                              href={`/manager/inspection/sites?worksiteId=${encodeURIComponent(worksite.id)}`}
                            >
                              {data.inspectionSiteCounts[worksite.id]}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
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
                          {worksite.address || "-"}
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
