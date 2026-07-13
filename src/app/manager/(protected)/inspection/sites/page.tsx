"use client";

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
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">현장관리</h1>
        <p className="mt-2 max-w-[640px] text-[21px] font-normal text-ink-muted-48">
          근무지별 현장을 등록하고 QR 점검 위치를 관리합니다.
        </p>
      </header>

      <section
        aria-label="현장 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <form className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between" onSubmit={handleSearch}>
          <div className="space-y-2 flex-1">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="site-search">
              현장이름
            </label>
            <input
              className="field"
              id="site-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="현장 이름을 입력하세요."
            />
          </div>
          <div className="flex gap-3">
            <button className="button-secondary min-w-[96px]" type="submit">
              조회
            </button>
            <Link className="button-primary gap-2 whitespace-nowrap" href="/manager/inspection/sites/new">
              <span>현장등록</span>
              <ArrowRightIcon size={18} />
            </Link>
          </div>
        </form>
      </section>

      <section
        aria-label="현장 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p className="status-warn text-center">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">근무지</th>
                  <th className="text-left">현장이름</th>
                  <th className="text-left">현장주소</th>
                </tr>
              </thead>
              <tbody>
                {sites.length === 0 ? (
                  <tr>
                    <td data-responsive-empty colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 현장이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sites.map((site) => (
                    <tr key={site.id} className="hover:bg-canvas-parchment transition-colors">
                      <td data-label="근무지">{site.worksite_name}</td>
                      <td data-label="현장이름" className="font-semibold">
                        <Link className="text-primary hover:underline" href={`/manager/inspection/sites/${site.id}`}>
                          {site.name}
                        </Link>
                      </td>
                      <td data-label="현장주소" className="text-ink-muted-48">{site.address}</td>
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
