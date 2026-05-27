"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { GpsInfo } from "@/lib/gps";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import WorksiteGpsPicker from "../../worksite-gps-picker";

type Worksite = {
  id: string;
  name: string;
  address: string;
  gps_info: GpsInfo;
  radius_meters: number;
};

type WorksiteResponse = {
  worksite: Worksite;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "근무지를 불러오지 못했습니다.");
  }

  return payload as T;
}

async function deleteRequest(url: string): Promise<void> {
  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "근무지를 삭제하지 못했습니다.");
  }
}

export default function WorksiteSavePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const worksiteId = params.id;
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [gpsInfo, setGpsInfo] = useState<GpsInfo | null>(null);
  const [radiusMeters, setRadiusMeters] = useState("");
  const [loading, setLoading] = useState(Boolean(worksiteId));
  const [error, setError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const routeError = worksiteId ? error : "근무지를 불러오지 못했습니다.";

  useEffect(() => {
    let ignore = false;

    async function loadWorksite() {
      try {
        const data = await fetchJson<WorksiteResponse>(`/api/worksites/${worksiteId}`);
        if (!ignore) {
          setName(data.worksite.name);
          setAddress(data.worksite.address ?? "");
          setGpsInfo(data.worksite.gps_info ?? null);
          setRadiusMeters(String(data.worksite.radius_meters));
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "근무지를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    if (!worksiteId) {
      return () => {
        ignore = true;
      };
    }

    void loadWorksite();

    return () => {
      ignore = true;
    };
  }, [worksiteId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!gpsInfo) {
      setError("GPS정보를 입력하거나 지도에서 위치를 선택하세요.");
      return;
    }

    try {
      await fetchJson<WorksiteResponse>(`/api/worksites/${worksiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, gpsInfo, radiusMeters }),
      });

      window.alert("자료가 저장되었습니다.");
      router.push("/manager/employee/worksites");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "근무지를 저장하지 못했습니다.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      await deleteRequest(`/api/worksites/${worksiteId}`);
      window.alert("자료가 삭제되었습니다.");
      router.push("/manager/employee/worksites");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "근무지를 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <p className="text-[14px] font-semibold text-ink-muted-48 uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">근무지수정</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            선택한 근무지의 이름, 주소, 실제 GPS정보, 허용 반경을 수정할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p className="text-[16px] text-status-warn">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-name">
                  근무지명
                </label>
                <input
                  className="field"
                  id="worksite-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-address">
                  근무지주소
                </label>
                <input
                  className="field"
                  id="worksite-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                />
              </div>
              <WorksiteGpsPicker address={address} value={gpsInfo} onChange={setGpsInfo} />
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-radius">
                  허용반경(m)
                </label>
                <input
                  className="field"
                  id="worksite-radius"
                  value={radiusMeters}
                  onChange={(event) => setRadiusMeters(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="button-primary w-full md:w-auto" type="submit">
                저장
              </button>
              <button
                className="button-secondary w-full md:w-auto"
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                삭제
              </button>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[16px] text-status-warn">{error}</p> : null}
      </section>

      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim px-5">
          <div className="w-full max-w-[420px] rounded-[18px] bg-canvas p-6 shadow-product border border-hairline">
            <h2 className="text-[24px] font-semibold">자료를 삭제하시겠습니까?</h2>
            <p className="mt-3 text-[16px] text-ink-muted-48">
              삭제하면 해당 근무지와 연결된 배정, 출퇴근 기록에 영향을 줄 수 있습니다.
            </p>

            <div className="mt-6 flex gap-3">
              <button className="button-primary flex-1" type="button" onClick={handleDelete} disabled={deleting}>
                예
              </button>
              <button
                className="button-secondary flex-1"
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
