"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { GpsInfo } from "@/lib/gps";
import WorksiteGpsPicker from "../../../employee/worksites/worksite-gps-picker";
import { SaveIcon } from "@/components/icons/save-icon";
import AlertModal from "@/components/modals/alert-modal";

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

type Worksite = {
  id: string;
  name: string;
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

export default function InspectionSiteNewPage() {
  const router = useRouter();
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [worksiteId, setWorksiteId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [address, setAddress] = useState("");
  const [gpsInfo, setGpsInfo] = useState<GpsInfo | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedWorksite = useMemo(
    () => worksites.find((worksite) => worksite.id === worksiteId) ?? null,
    [worksiteId, worksites],
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
          setWorksiteId(nextWorksites[0]?.id ?? "");
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

  function handleGpsChange(nextGpsInfo: GpsInfo | null) {
    setGpsInfo(nextGpsInfo);
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
      await postJson("/api/inspection/sites", {
        worksiteId,
        name: siteName,
        address,
        gpsInfo,
      });
      setAlertMessage("현장이 저장되었습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "현장을 등록하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleAlertClose() {
    setAlertMessage("");
    router.push("/manager/inspection/sites");
    router.refresh();
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <h1 className="text-[40px] font-semibold leading-[1.1]">현장등록</h1>
        <p className="text-[21px] font-normal text-muted-foreground mt-2 max-w-[640px]">
          근무지에 속한 현장을 등록하고 점검 QR을 생성합니다.
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[32px] border border-border/50">
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
                placeholder="현장 이름을 입력하세요."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[14px] font-semibold text-muted-foreground ml-1" htmlFor="inspection-address">
                현장주소
              </label>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_132px]">
                <Input
                  className="w-full"
                  id="inspection-address"
                  value={address}
                  placeholder="주소 검색으로 선택하세요."
                  readOnly
                  required
                />
                <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full whitespace-nowrap md:w-full" type="button" onClick={openAddressPopup} variant="outline">
                  주소 검색
                </Button>
              </div>
            </div>

            <WorksiteGpsPicker address={address} value={gpsInfo} onChange={handleGpsChange} />
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              aria-label="저장"
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 w-full justify-center md:w-auto"
              disabled={saving || !selectedWorksite}
              type="submit"
            >
              <SaveIcon size={20} />
            </Button>
          </div>
        </form>

        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={handleAlertClose}
        title="알림"
        description={alertMessage}
      />
    </section>
  );
}
