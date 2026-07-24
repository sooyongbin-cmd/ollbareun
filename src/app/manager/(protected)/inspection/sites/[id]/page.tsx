"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  interface NDEFReadingEvent {
    message: {
      records: Array<{ recordType: string; data?: DataView | string }>;
    };
  }

  interface NDEFReader {
    write(
      message: string | { records: Array<{ recordType: string; data: string }> },
      options?: { signal: AbortSignal }
    ): Promise<void>;
    scan(options?: { signal: AbortSignal }): Promise<void>;
    onreading: ((event: NDEFReadingEvent) => void) | null;
    onreadingerror: (() => void) | null;
  }
  interface Window {
    jusoCallBack?: (
      roadFullAddr?: string,
      roadAddrPart1?: string,
      addrDetail?: string,
      roadAddrPart2?: string,
      ...rest: string[]
    ) => void;
    NDEFReader?: new () => NDEFReader;
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
  const [isWritingNfc, setIsWritingNfc] = useState(false);
  const [nfcWriteStatus, setNfcWriteStatus] = useState<"" | "scanning" | "success" | "error">("");
  const [nfcWriteError, setNfcWriteError] = useState("");
  const [nfcAbortController, setNfcAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (nfcAbortController) {
        nfcAbortController.abort();
      }
    };
  }, [nfcAbortController]);

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
        fileName: `올바름_현장점검_${savedSite.worksite_name}_${savedSite.name}`,
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

  async function handleWriteNfc() {
    if (typeof window === "undefined") return;

    setNfcWriteError("");
    setNfcWriteStatus("scanning");
    setIsWritingNfc(true);

    if (!window.NDEFReader) {
      setNfcWriteStatus("error");
      setNfcWriteError("이 브라우저/기기는 NFC 쓰기 기능을 지원하지 않습니다. (Android Chrome 등을 사용해 주세요.)");
      return;
    }

    const controller = new AbortController();
    setNfcAbortController(controller);

    try {
      const NDEFReader = window.NDEFReader;
      const ndef = new NDEFReader();

      const protocol = window.location.protocol ? `${window.location.protocol}//` : "https://";
      const fullUrl = nfcUrl.startsWith("http://") || nfcUrl.startsWith("https://")
        ? nfcUrl
        : `${protocol}${nfcUrl}`;

      await ndef.write(
        {
          records: [
            {
              recordType: "url",
              data: fullUrl,
            },
          ],
        },
        { signal: controller.signal },
      );

      setNfcWriteStatus("success");
      setTimeout(() => {
        setIsWritingNfc(false);
        setNfcUrl("");
        setNfcWriteStatus("");
      }, 1500);
    } catch (err: unknown) {
      const errorName = err && typeof err === "object" && "name" in err ? (err as { name: string }).name : "";
      const errorMessage = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "NFC 카드 쓰기 중 오류가 발생했습니다.";

      if (errorName !== "AbortError") {
        setNfcWriteStatus("error");
        setNfcWriteError(errorMessage || "NFC 카드 쓰기 중 오류가 발생했습니다.");
      }
    } finally {
      setNfcAbortController(null);
    }
  }

  function handleCancelNfcWrite() {
    if (nfcAbortController) {
      nfcAbortController.abort();
    }
    setIsWritingNfc(false);
    setNfcWriteStatus("");
    setNfcWriteError("");
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
        <p className="text-[21px] font-normal text-muted-foreground mt-2 max-w-[640px]">
          현장 정보를 수정하고 QR코드와 NFC URL을 생성합니다.
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
        {loading ? (
          <ManagerLoadingMessage />
        ) : error && !savedSite ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">{error}</p>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="inspection-worksite">
                  근무지
                </label>
                <NativeSelect
                  className="w-full"
                  id="inspection-worksite"
                  value={worksiteId}
                  onChange={(event) => setWorksiteId(event.target.value)}
                  required
                >
                  {worksites.length === 0 ? <NativeSelectOption value="">근무지 없음</NativeSelectOption> : null}
                  {worksites.map((worksite) => (
                    <NativeSelectOption key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="inspection-site-name">
                  현장명
                </label>
                <Input
                  className="w-full"
                  id="inspection-site-name"
                  name="name"
                  value={siteName}
                  onChange={(event) => setSiteName(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="inspection-address">
                  현장주소
                </label>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_132px]">
                  <Input className="w-full" id="inspection-address" value={address} readOnly required />
                  <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full whitespace-nowrap md:w-full" type="button" onClick={openAddressPopup}>
                    주소 검색
                  </Button>
                </div>
              </div>

              <WorksiteGpsPicker address={address} value={gpsInfo} onChange={setGpsInfo} hideInput />
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <Button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full justify-center md:w-auto" disabled={saving} type="submit">
                <SaveIcon size={20} />
                <span>저장</span>
              </Button>
              <Button
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full justify-center md:w-auto"
                disabled={printing || !savedSite}
                onClick={handleQrPrint}
                type="button"
              >
                QR코드
              </Button>
              <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full justify-center md:w-auto" onClick={handleNfcUrl} type="button">
                NFC(URL)
              </Button>
              <Button
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full justify-center md:w-auto"
                disabled={deleting}
                onClick={handleDelete}
                type="button"
              >
                삭제
              </Button>
            </div>
          </form>
        )}

        {error && savedSite ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={handleAlertClose}
        title="알림"
        description={alertMessage}
      />

      <Dialog open={Boolean(nfcUrl)} onOpenChange={(open) => !open && setNfcUrl("")}>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>NFC(URL)</DialogTitle>
            <DialogDescription>NFC Tools의 URL 레코드에 아래 주소를 붙여넣으세요.</DialogDescription>
          </DialogHeader>
            <Textarea className="w-full mt-4 min-h-[112px]" readOnly value={nfcUrl} />
            {copyMessage ? <p className="mt-3 text-[14px] font-semibold text-primary">{copyMessage}</p> : null}
            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <Button className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 flex-1" onClick={handleCopyNfcUrl} type="button">
                복사
              </Button>
              <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 flex-1" onClick={handleWriteNfc} type="button">
                NFC 쓰기
              </Button>
              <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 flex-1" onClick={() => setNfcUrl("")} type="button">
                닫기
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isWritingNfc} onOpenChange={(open) => !open && handleCancelNfcWrite()}>
        <DialogContent className="max-w-[480px] text-center" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>NFC 카드 쓰기</DialogTitle>
            <DialogDescription>상태 안내에 따라 NFC 카드를 기기에 가까이 대어주세요.</DialogDescription>
          </DialogHeader>
            
            {nfcWriteStatus === "scanning" && (
              <div className="mt-6 space-y-4">
                <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-primary/20 flex items-center justify-center text-primary text-[24px]">
                  📡
                </div>
                <p className="text-[16px] text-muted-foreground leading-relaxed">
                  NFC 카드(스티커)를 디바이스 뒷면이나<br />NFC 리더기 근처에 대어 주세요.
                </p>
                <p className="text-[13px] text-muted-foreground animate-pulse">
                  인식 대기 중...
                </p>
              </div>
            )}

            {nfcWriteStatus === "success" && (
              <div className="mt-6 space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[24px]">
                  ✓
                </div>
                <p className="text-[16px] font-semibold text-primary">
                  NFC 쓰기 완료!
                </p>
                <p className="text-[14px] text-muted-foreground">
                  성공적으로 작성되었습니다. 창을 닫습니다.
                </p>
              </div>
            )}

            {nfcWriteStatus === "error" && (
              <div className="mt-6 space-y-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-[24px]">
                  ⚠
                </div>
                <p className="text-[16px] font-semibold text-destructive">
                  NFC 쓰기 실패
                </p>
                <p className="text-[14px] text-muted-foreground leading-relaxed px-2">
                  {nfcWriteError}
                </p>
              </div>
            )}

            <div className="mt-8">
              <Button
                className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                onClick={handleCancelNfcWrite}
                type="button"
              >
                {nfcWriteStatus === "success" ? "닫기" : "취소"}
              </Button>
            </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
