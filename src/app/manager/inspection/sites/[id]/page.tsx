"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { buildInspectionQrPayload, type InspectionSiteRow } from "@/lib/inspection";
import type { GpsInfo } from "@/lib/gps";
import WorksiteGpsPicker from "../../../employee/worksites/worksite-gps-picker";
import ManagerLoadingMessage from "../../../manager-loading-message";
import AlertModal from "@/components/modals/alert-modal";
import { SaveIcon } from "@/components/icons/save-icon";
import { saveInspectionQrImage } from "../../save-inspection-qr";

declare global {
  interface Window {
    jusoCallBack?: (
      roadFullAddr?: string,
      roadAddrPart1?: string,
      addrDetail?: string,
      roadAddrPart2?: string,
      ...rest: string[]
    ) => void;
  }
}

type PageProps = {
  params: Promise<{ id: string }>;
};

type Worksite = {
  id: string;
  name: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "요청을 처리하지 못했습니다.");
  }

  return payload as T;
}

function buildNfcUrl(siteId: string) {
  return `${window.location.host}/guard/main/inspection-nfc?s=${encodeURIComponent(siteId)}`;
}

export default function InspectionSiteDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [siteId, setSiteId] = useState("");
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [worksiteId, setWorksiteId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [address, setAddress] = useState("");
  const [gpsInfo, setGpsInfo] = useState<GpsInfo | null>(null);
  const [savedSite, setSavedSite] = useState<InspectionSiteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [shouldReturnToList, setShouldReturnToList] = useState(false);
  const [nfcUrl, setNfcUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadSite() {
      try {
        const { id } = await params;
        const [sitePayload, bootstrapPayload] = await Promise.all([
          fetchJson<{ site: InspectionSiteRow }>(`/api/inspection/sites/${encodeURIComponent(id)}`),
          fetchJson<{ worksites?: Worksite[] }>("/api/bootstrap"),
        ]);

        if (!ignore) {
          const nextSite = sitePayload.site;
          setSiteId(id);
          setSavedSite(nextSite);
          setWorksites(bootstrapPayload.worksites ?? []);
          setWorksiteId(nextSite.worksite_id);
          setSiteName(nextSite.name);
          setAddress(nextSite.address);
          setGpsInfo(nextSite.gps_info);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "현장 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadSite();

    return () => {
      ignore = true;
    };
  }, [params]);

  useEffect(() => {
    window.jusoCallBack = (roadFullAddr, roadAddrPart1, addrDetail, roadAddrPart2) => {
      const selectedAddress =
        roadFullAddr?.trim() || [roadAddrPart1, addrDetail, roadAddrPart2].filter(Boolean).join(" ").trim();
      setAddress(selectedAddress);
    };

    return () => {
      delete window.jusoCallBack;
    };
  }, []);

  function openAddressPopup() {
    const popup = window.open(
      "/api/juso/popup",
      "jusoPopup",
      "width=570,height=620,scrollbars=yes,resizable=yes",
    );
    popup?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!gpsInfo) {
      setError("GPS정보를 입력하거나 지도에서 위치를 선택하세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = await fetchJson<{ site: InspectionSiteRow }>(
        `/api/inspection/sites/${encodeURIComponent(siteId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worksiteId, name: siteName, address, gpsInfo }),
        },
      );
      setSavedSite(payload.site);
      setShouldReturnToList(true);
      setAlertMessage("현장이 저장되었습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "현장을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!siteId || !window.confirm("현장을 삭제하시겠습니까?")) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      await fetchJson<{ success: boolean }>(`/api/inspection/sites/${encodeURIComponent(siteId)}`, {
        method: "DELETE",
      });
      setShouldReturnToList(true);
      setAlertMessage("현장이 삭제되었습니다.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "현장을 삭제하지 못했습니다.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleQrPrint() {
    if (!savedSite) {
      return;
    }

    setPrinting(true);
    setError("");
    try {
      await saveInspectionQrImage({
        payload: buildInspectionQrPayload(savedSite),
        worksiteName: savedSite.worksite_name,
        siteName: savedSite.name,
        fileName: `올바른_현장점검_${savedSite.worksite_name}_${savedSite.name}`,
      });
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : "QR 파일을 저장하지 못했습니다.");
    } finally {
      setPrinting(false);
    }
  }

  function handleNfcUrl() {
    if (!siteId) {
      return;
    }
    setCopyMessage("");
    setNfcUrl(buildNfcUrl(siteId));
  }

  async function handleCopyNfcUrl() {
    await navigator.clipboard.writeText(nfcUrl);
    setCopyMessage("복사되었습니다.");
  }

  function handleAlertClose() {
    setAlertMessage("");
    if (shouldReturnToList) {
      setShouldReturnToList(false);
      router.push("/manager/inspection/sites");
      router.refresh();
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">현장상세</h1>
        <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[640px]">
          현장 정보를 수정하고 QR코드와 NFC URL을 생성합니다.
        </p>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error && !savedSite ? (
          <p className="status-warn text-center">{error}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="inspection-worksite">
                  근무지
                </label>
                <select
                  className="field"
                  id="inspection-worksite"
                  value={worksiteId}
                  onChange={(event) => setWorksiteId(event.target.value)}
                  required
                >
                  {worksites.length === 0 ? <option value="">근무지 없음</option> : null}
                  {worksites.map((worksite) => (
                    <option key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="inspection-site-name">
                  현장명
                </label>
                <input
                  className="field"
                  id="inspection-site-name"
                  name="name"
                  value={siteName}
                  onChange={(event) => setSiteName(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="inspection-address">
                  현장주소
                </label>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_132px]">
                  <input className="field" id="inspection-address" value={address} readOnly required />
                  <button className="button-secondary w-full whitespace-nowrap md:w-full" type="button" onClick={openAddressPopup}>
                    주소 검색
                  </button>
                </div>
              </div>

              <WorksiteGpsPicker address={address} value={gpsInfo} onChange={setGpsInfo} hideInput />
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button className="button-primary w-full justify-center md:w-auto" disabled={saving} type="submit">
                <SaveIcon size={20} />
                <span>저장</span>
              </button>
              <button
                className="button-secondary w-full justify-center md:w-auto"
                disabled={printing || !savedSite}
                onClick={handleQrPrint}
                type="button"
              >
                QR코드
              </button>
              <button className="button-secondary w-full justify-center md:w-auto" onClick={handleNfcUrl} type="button">
                NFC(URL)
              </button>
              <button
                className="button-secondary w-full justify-center md:w-auto"
                disabled={deleting}
                onClick={handleDelete}
                type="button"
              >
                삭제
              </button>
            </div>
          </form>
        )}

        {error && savedSite ? <p className="status-warn mt-6 text-center">{error}</p> : null}
      </section>

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={handleAlertClose}
        title="알림"
        description={alertMessage}
      />

      {nfcUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim px-5">
          <div className="w-full max-w-[560px] rounded-[18px] bg-canvas p-6 shadow-product border border-hairline">
            <h2 className="text-[24px] font-semibold">NFC(URL)</h2>
            <p className="mt-3 text-[16px] text-ink-muted-48 leading-relaxed">
              NFC Tools의 URL 레코드에 아래 주소를 붙여넣으세요.
            </p>
            <textarea className="field mt-4 min-h-[112px]" readOnly value={nfcUrl} />
            {copyMessage ? <p className="mt-3 text-[14px] font-semibold text-primary">{copyMessage}</p> : null}
            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <button className="button-primary flex-1" onClick={handleCopyNfcUrl} type="button">
                복사
              </button>
              <button className="button-secondary flex-1" onClick={() => setNfcUrl("")} type="button">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
