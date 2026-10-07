"use client";

import { educationTypeLabels, educationTypes, type EducationType } from "@/lib/education-periods";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";


type EducationResourceRow = {
  id: string;
  title: string;
  youtube_link: string;
  created_at: string;
  education_type: EducationType;
  startdate: string;
  enddate: string;
};

export default function EducationResourcesPage() {
  const [resources, setResources] = useState<EducationResourceRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadResources() {
      try {
        const response = await fetch("/api/education/resources");
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "교육자료 목록을 불러오지 못했습니다.");
        if (!ignore) setResources(payload.resources ?? []);
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

  const sortedResources = useMemo(() => [...filteredResources].sort((left, right) =>
    educationTypes.indexOf(left.education_type) - educationTypes.indexOf(right.education_type)
    || left.title.localeCompare(right.title, "ko-KR")), [filteredResources]);
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
        <div className="flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {filteredResources.length}</span>
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
                  <TableHead>교육구분</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>시작일</TableHead>
                  <TableHead>종료일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResources.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={4} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 교육자료가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedResources.map((resource) => (
                    <TableRow key={resource.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="교육구분">{resource.education_type === "monthly" ? "월별" : educationTypeLabels[resource.education_type]}</TableCell>
                      <TableCell data-label="제목" className="font-semibold">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/safety/resources/save/${resource.id}`}
                        >
                          {resource.title}
                        </Link>
                      </TableCell>
                      <TableCell data-label="시작일">{resource.startdate}</TableCell>
                      <TableCell data-label="종료일">{resource.enddate}</TableCell>
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
