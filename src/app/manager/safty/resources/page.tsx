"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

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

          <Link className="button-primary w-full text-center md:w-auto" href="/manager/safty/resources/new">
            교재등록
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
                  <th className="text-left">제목</th>
                  <th className="text-left">유튜브 링크</th>
                  <th className="text-left">이수현황</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 교육자료가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredResources.map((resource) => (
                    <tr key={resource.id} className="hover:bg-canvas-parchment transition-colors">
                      <td className="font-semibold">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/safty/resources/save/${resource.id}`}
                        >
                          {resource.title}
                        </Link>
                      </td>
                      <td className="text-ink-muted-48">
                        <a
                          className="underline-offset-4 hover:underline"
                          href={resource.youtube_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {resource.youtube_link}
                        </a>
                      </td>
                      <td className="font-semibold text-ink-muted-80">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/safty/completions?resourceId=${encodeURIComponent(resource.id)}`}
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
