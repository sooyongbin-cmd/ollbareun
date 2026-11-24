"use client";

import type { DetailData } from "@/lib/detail-changes";
import type { RegistrationFormProps } from "@/components/modals/registration-modal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { GpsInfo } from "@/lib/gps";
import WorksiteGpsPicker, { searchKakaoPlaces } from "../worksite-gps-picker";
import { SaveIcon } from "@/components/icons/save-icon";
import AlertModal from "@/components/modals/alert-modal";
import ProcessingModal from "@/components/modals/processing-modal";

type WorksiteResponse = {
  worksite: {
    id: string;
    name: string;
  };
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  }

  return payload as T;
}

export default function WorksiteNewPage({ modal = false, onClose, onSaved }: RegistrationFormProps) {
  const [createdRecord, setCreatedRecord] = useState<DetailData | null>(null);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [gpsInfo, setGpsInfo] = useState<GpsInfo | null>(null);
  const [keyword, setKeyword] = useState("");
  const [places, setPlaces] = useState<Awaited<ReturnType<typeof searchKakaoPlaces>>>([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [createdWorksiteId, setCreatedWorksiteId] = useState<string | null>(null);
  const router = useRouter();

  async function searchPlaces() {
    const query = keyword.trim();
    if (searching || !query) return;

    setSearching(true);
    setPlaces([]);
    setSearchStatus("장소를 검색하는 중입니다.");
    try {
      const results = await searchKakaoPlaces(query);
      setPlaces(results);
      setSearchStatus(results.length ? "" : "검색 결과가 없습니다.");
    } catch (searchError) {
      setSearchStatus(searchError instanceof Error ? searchError.message : "장소 검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  }

  function selectPlace(place: (typeof places)[number]) {
    const selectedAddress = place.road_address_name || place.address_name;
    const latitude = Number(place.y);
    const longitude = Number(place.x);
    if (!selectedAddress || !place.y.trim() || !place.x.trim()
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      setSearchStatus("선택한 장소의 주소 또는 GPS정보를 확인할 수 없습니다.");
      return;
    }

    setAddress(selectedAddress);
    setGpsInfo({ latitude, longitude });
    setPlaces([]);
    setSearchStatus("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");

    if (!address) {
      setError("장소 검색 결과에서 근무지를 선택하세요.");
      return;
    }

    if (!gpsInfo) {
      setError("GPS정보를 입력하거나 지도에서 위치를 선택하세요.");
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);

    try {
      const result = await postJson<WorksiteResponse>("/api/worksites", {
        name: data.get("name"),
        address,
        gpsInfo,
        radiusMeters: data.get("radiusMeters"),
      });

      setCreatedRecord(result.worksite);
      setCreatedWorksiteId(result.worksite.id);
      setAlertMessage("자료를 저장하였습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청을 처리하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      {!modal ? <header>
        <h1 className="text-[1.75rem] leading-[1.2]">근무지등록</h1>
      </header> : null}

      <section className="manager-section bg-muted/40 rounded-xl border border-border/50">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-name">
                근무지명
              </label>
              <Input className="w-full" id="worksite-name" name="name" placeholder="작업장 이름을 입력하세요." required />
            </div>
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-place">
                카카오 장소 검색
              </label>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8.25rem]">
                <Input
                  id="worksite-place"
                  value={keyword}
                  disabled={searching}
                  placeholder="건물명 또는 사업장명을 입력하세요."
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPlaces([]);
                    setSearchStatus("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.nativeEvent.isComposing || event.keyCode === 229) return;
                    event.preventDefault();
                    void searchPlaces();
                  }}
                />
                <Button type="button" variant="outline" disabled={searching || !keyword.trim()} onClick={searchPlaces}>
                  장소 검색
                </Button>
              </div>
              {searchStatus && <p role="status" className="text-sm text-muted-foreground">{searchStatus}</p>}
              {places.length > 0 && (
                <ul aria-label="장소 검색 결과" className="max-h-48 divide-y overflow-y-auto rounded-md border">
                  {places.map((place) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent"
                        onClick={() => selectPlace(place)}
                      >
                        <span className="block text-sm font-medium">{place.place_name}</span>
                        <span className="block text-sm text-muted-foreground">{place.road_address_name || place.address_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-address">
                근무지주소
              </label>
              <Input
                id="worksite-address"
                name="address"
                value={address}
                placeholder="장소 검색 결과에서 선택하세요."
                readOnly
              />
            </div>
            <WorksiteGpsPicker value={gpsInfo} onChange={setGpsInfo} />
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-radius">
                허용반경(m)
              </label>
              <Input
                className="w-full"
                defaultValue="100"
                id="worksite-radius"
                name="radiusMeters"
                placeholder="100"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              aria-label="저장"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
              data-testid="worksite-submit"
              disabled={saving}
              type="submit"
            >
              <SaveIcon size={20} />
            </Button>
            <Button
              aria-label={modal ? "닫기" : "목록"}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 md:ml-auto w-full md:w-auto"
              type="button"
              onClick={() => onClose ? onClose() : router.push("/manager/employee/worksites")}
              variant="outline"
            >
              {modal ? "닫기" : "목록"}
            </Button>
          </div>
        </form>

        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      <ProcessingModal isOpen={saving} message="저장처리중입니다..." />

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => {
          setAlertMessage("");
          if (onSaved && createdRecord) {
            onSaved({ record: createdRecord });
            return;
          }
          router.push("/manager/employee/worksites");
        }}
        secondaryButtonLabel={createdWorksiteId ? "현장등록" : undefined}
        onSecondaryButtonClick={createdWorksiteId ? () => {
          setAlertMessage("");
          router.push(`/manager/inspection/sites/new?worksiteId=${encodeURIComponent(createdWorksiteId)}`);
        } : undefined}
        title="알림"
        description={alertMessage}
      />
    </section>
  );
}
