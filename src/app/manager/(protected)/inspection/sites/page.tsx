"use client";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";

type InspectionSite = {
  id: string;
  worksite_id: string;
  worksite_name: string;
  sort_order: number;
  name: string;
  today_inspection?: {
    inspected_at: string;
    employee_name: string;
    employee_role: string;
  } | null;
};

type Worksite = {
  id: string;
  name: string;
};

async function fetchSites(name: string, worksiteId: string, worksiteName: string) {
  const params = new URLSearchParams();
  if (worksiteId) params.set("worksiteId", worksiteId);
  if (worksiteName) params.set("worksiteName", worksiteName);
  if (name.trim()) params.set("name", name.trim());
  const queryString = params.toString();
  const query = queryString ? `?${queryString}` : "";
  const response = await fetch(`/api/inspection/sites${query}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "점검지 목록을 불러오지 못했습니다.");
  }

  return (payload.sites ?? []) as InspectionSite[];
}

function sortInspectionSites(sites: InspectionSite[]) {
  return [...sites].sort((left, right) => {
    const worksiteComparison = (left.worksite_name ?? "").localeCompare(right.worksite_name ?? "", "ko-KR");
    if (worksiteComparison !== 0) {
      return worksiteComparison;
    }

    const orderComparison = (left.sort_order ?? Number.MAX_SAFE_INTEGER) - (right.sort_order ?? Number.MAX_SAFE_INTEGER);
    if (orderComparison !== 0) {
      return orderComparison;
    }

    return (left.name ?? "").localeCompare(right.name ?? "", "ko-KR");
  });
}

function formatInspectionTime(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return values.hour && values.minute ? `${values.hour}:${values.minute}` : "";
}

export default function InspectionSitesPage() {
  const searchParams = useSearchParams();
  const requestedWorksiteId = searchParams?.get("worksiteId") ?? "";
  const previousRequestedWorksiteId = useRef(requestedWorksiteId);
  const [query, setQuery] = useState("");
  const [worksiteFilter, setWorksiteFilter] = useState(requestedWorksiteId);
  const [worksiteNameFilter, setWorksiteNameFilter] = useState("");
  const [worksiteQuery, setWorksiteQuery] = useState("");
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [sites, setSites] = useState<InspectionSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggedSiteId, setDraggedSiteId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const worksiteNameOptions = useMemo(
    () => Array.from(new Set(worksites.map((worksite) => worksite.name))).sort((left, right) => left.localeCompare(right, "ko-KR")),
    [worksites],
  );
  const siteNameOptions = useMemo(
    () => Array.from(new Set(sites.map((site) => site.name))).sort((left, right) => left.localeCompare(right, "ko-KR")),
    [sites],
  );

  useEffect(() => {
    let ignore = false;

    async function loadWorksites() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "근무지 목록을 불러오지 못했습니다.");
        }
        if (!ignore) {
          const nextWorksites = (payload.worksites ?? []) as Worksite[];
          setWorksites(nextWorksites);
          const requestedWorksiteId = new URLSearchParams(window.location.search).get("worksiteId") ?? "";
          const selectedWorksite = nextWorksites.find((worksite) => worksite.id === requestedWorksiteId);
          if (selectedWorksite) {
            setWorksiteQuery((current) => current || selectedWorksite.name);
          }
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "근무지 목록을 불러오지 못했습니다.");
        }
      }
    }

    void loadWorksites();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetchSites(query, worksiteFilter, worksiteNameFilter)
        .then((nextSites) => {
          if (!ignore) {
            setSites(sortInspectionSites(nextSites));
          }
        })
        .catch((loadError) => {
          if (!ignore) {
            setError(loadError instanceof Error ? loadError.message : "점검지 목록을 불러오지 못했습니다.");
          }
        })
        .finally(() => {
          if (!ignore) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [query, worksiteFilter, worksiteNameFilter]);

  useEffect(() => {
    if (previousRequestedWorksiteId.current === requestedWorksiteId) {
      return;
    }

    previousRequestedWorksiteId.current = requestedWorksiteId;
    setWorksiteFilter(requestedWorksiteId);
    setWorksiteNameFilter("");
    setQuery("");
    const selectedWorksite = worksites.find((worksite) => worksite.id === requestedWorksiteId);
    setWorksiteQuery(selectedWorksite?.name ?? "");
  }, [requestedWorksiteId, worksites]);

  function handleWorksiteChange(value: string) {
    setWorksiteQuery(value);
    const normalizedWorksiteQuery = value.trim();
    const matchingWorksite = worksites.find(
      (worksite) => worksite.name.toLocaleLowerCase("ko-KR") === normalizedWorksiteQuery.toLocaleLowerCase("ko-KR"),
    );
    setWorksiteFilter(matchingWorksite?.id ?? "");
    setWorksiteNameFilter(matchingWorksite ? "" : normalizedWorksiteQuery);
  }

  async function handleDrop(targetSite: InspectionSite) {
    const source = sites.find((site) => site.id === draggedSiteId);
    setDraggedSiteId(null);
    if (!source || source.id === targetSite.id || source.worksite_name !== targetSite.worksite_name) return;

    const previousSites = sites;
    setSites((currentSites) => sortInspectionSites(currentSites.map((site) => {
      if (site.id === source.id) return { ...site, sort_order: targetSite.sort_order };
      if (site.id === targetSite.id) return { ...site, sort_order: source.sort_order };
      return site;
    })));
    setReordering(true);
    setError("");
    try {
      const response = await fetch("/api/inspection/sites/swap-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draggedSiteId: source.id, targetSiteId: targetSite.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "점검순서를 변경하지 못했습니다.");
    } catch (reorderError) {
      setSites(previousSites);
      setError(reorderError instanceof Error ? reorderError.message : "점검순서를 변경하지 못했습니다.");
    } finally {
      setReordering(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">점검지관리</h1>
      </header>

      <section
        aria-label="점검지 검색"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="site-worksite-search">
              근무지
            </label>
            <Input
              className="w-full"
              id="site-worksite-search"
              list="inspection-worksite-options"
              placeholder="근무지를 입력하세요."
              value={worksiteQuery}
              onChange={(event) => handleWorksiteChange(event.target.value)}
            />
            <datalist id="inspection-worksite-options">
              {worksiteNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="site-search">
              점검지
            </label>
            <Input
              className="w-full"
              id="site-search"
              list="inspection-site-options"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="점검지를 입력하세요."
            />
            <datalist id="inspection-site-options">
              {siteNameOptions.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <div className="flex gap-3">
            <Link className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 gap-2 whitespace-nowrap" href="/manager/inspection/sites/new">
              <span>점검지 등록</span>
              <ArrowRightIcon size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section
        aria-label="점검지 목록"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {sites.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">근무지</TableHead>
                  <TableHead className="text-left">순서</TableHead>
                  <TableHead className="text-left">점검지명</TableHead>
                  <TableHead className="text-left">점검시각</TableHead>
                  <TableHead className="text-left">점검자</TableHead>
                  <TableHead className="text-left">직군</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={6} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 점검지가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sites.map((site) => (
                    <TableRow
                      key={site.id}
                      className={`hover:bg-muted/40 transition-colors ${reordering ? "opacity-60" : ""}`}
                      onDragOver={(event: DragEvent<HTMLTableRowElement>) => {
                        if (draggedSiteId && site.worksite_name === sites.find((item) => item.id === draggedSiteId)?.worksite_name) {
                          event.preventDefault();
                        }
                      }}
                      onDrop={(event: DragEvent<HTMLTableRowElement>) => {
                        event.preventDefault();
                        void handleDrop(site);
                      }}
                    >
                      <TableCell data-label="근무지">{site.worksite_name}</TableCell>
                      <TableCell data-label="순서">{site.sort_order ?? ""}</TableCell>
                      <TableCell data-label="점검지명" className="font-semibold" onDragOver={(event) => event.preventDefault()}>
                        <Link className="text-primary hover:underline" href={`/manager/inspection/sites/${site.id}`}>
                          <span
                            draggable={!reordering}
                            onDragStart={(event) => {
                              setDraggedSiteId(site.id);
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", site.id);
                            }}
                            onDragEnd={() => setDraggedSiteId(null)}
                            className="cursor-grab active:cursor-grabbing"
                            title="드래그하여 같은 근무지 내 점검순서 변경"
                          >
                            {site.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell data-label="점검시각">{formatInspectionTime(site.today_inspection?.inspected_at)}</TableCell>
                      <TableCell data-label="점검자">{site.today_inspection?.employee_name ?? ""}</TableCell>
                      <TableCell data-label="직군">{site.today_inspection?.employee_role ?? ""}</TableCell>
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
