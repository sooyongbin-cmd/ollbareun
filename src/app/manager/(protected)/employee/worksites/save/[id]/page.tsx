"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { GpsInfo } from "@/lib/gps";
import ManagerLoadingMessage from "../../../../manager-loading-message";
import WorksiteGpsPicker from "../../worksite-gps-picker";
import { SaveIcon } from "@/components/icons/save-icon";
import { DeleteIcon } from "@/components/icons/delete-icon";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";

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
  const [alertMessage, setAlertMessage] = useState("");
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

      setAlertMessage("자료가 저장되었습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "근무지를 저장하지 못했습니다.");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError("");

    try {
      await deleteRequest(`/api/worksites/${worksiteId}`);
      setAlertMessage("자료가 삭제되었습니다.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "근무지를 삭제하지 못했습니다.");
      setDeleteConfirmOpen(false);
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <p className="text-[0.875rem] font-semibold text-muted-foreground uppercase">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">근무지 상세</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            선택한 근무지의 이름, 주소, 실제 GPS정보, 허용 반경을 수정할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : routeError ? (
          <p className="text-[1rem] text-destructive">{routeError}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-name">
                  근무지명
                </label>
                <Input
                  className="w-full"
                  id="worksite-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-address">
                  근무지주소
                </label>
                <Input
                  className="w-full"
                  id="worksite-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  required
                />
              </div>
              <WorksiteGpsPicker address={address} value={gpsInfo} onChange={setGpsInfo} />
              <div className="space-y-2">
                <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-radius">
                  허용반경(m)
                </label>
                <Input
                  className="w-full"
                  id="worksite-radius"
                  value={radiusMeters}
                  onChange={(event) => setRadiusMeters(event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button aria-label="저장" className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto" type="submit">
                <SaveIcon size={20} />
              </Button>
              <Button
                aria-label="삭제"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                variant="outline"
              >
                <DeleteIcon size={20} />
              </Button>
            </div>
          </form>
        )}

        {error ? <p className="mt-6 text-[1rem] text-destructive">{error}</p> : null}
      </section>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="자료를 삭제하시겠습니까?"
        description="삭제하면 해당 근무지와 연결된 배정, 출퇴근 기록에 영향을 줄 수 있습니다."
        loading={deleting}
      />

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => {
          setAlertMessage("");
          router.push("/manager/employee/worksites");
        }}
        title="알림"
        description={alertMessage}
      />
    </section>
  );
}
