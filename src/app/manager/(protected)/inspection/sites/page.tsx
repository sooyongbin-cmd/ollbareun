"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";

type InspectionSite = {
  id: string;
  worksite_name: string;
  name: string;
  address: string;
};

async function fetchSites(name: string) {
  const query = name.trim() ? `?name=${encodeURIComponent(name.trim())}` : "";
  const response = await fetch(`/api/inspection/sites${query}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "현장 목록을 불러오지 못했습니다.");
  }

  return (payload.sites ?? []) as InspectionSite[];
}

export default function InspectionSitesPage() {
  const [query, setQuery] = useState("");
  const [sites, setSites] = useState<InspectionSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSites(name = query) {
    await Promise.resolve();
    setLoading(true);
    setError("");
    try {
      setSites(await fetchSites(name));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "현장 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    fetchSites("")
      .then((nextSites) => {
        if (!ignore) {
          setSites(nextSites);
        }
      })
      .catch((loadError) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "현장 목록을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadSites(query);
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">현장관리</h1>
        <p className="mt-2 max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
          근무지별 현장을 등록하고 점검 위치를 관리합니다.
        </p>
      </header>

      <section
        aria-label="현장 검색"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <form className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" onSubmit={handleSearch}>
          <div className="space-y-2 flex-1">
            <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="site-search">
              현장이름
            </label>
            <Input
              className="w-full"
              id="site-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="현장 이름을 입력하세요."
            />
          </div>
          <div className="flex gap-3">
            <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 min-w-[6rem]" type="submit" variant="outline">
              조회
            </Button>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 gap-2 whitespace-nowrap" href="/manager/inspection/sites/new">
              <span>현장등록</span>
              <ArrowRightIcon size={18} />
            </Link>
          </div>
        </form>
      </section>

      <section
        aria-label="현장 목록"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
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
                  <TableHead className="text-left">현장이름</TableHead>
                  <TableHead className="text-left">현장주소</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={3} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 현장이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sites.map((site) => (
                    <TableRow key={site.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="근무지">{site.worksite_name}</TableCell>
                      <TableCell data-label="현장이름" className="font-semibold">
                        <Link className="text-primary hover:underline" href={`/manager/inspection/sites/${site.id}`}>
                          {site.name}
                        </Link>
                      </TableCell>
                      <TableCell data-label="현장주소" className="text-muted-foreground">{site.address}</TableCell>
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
