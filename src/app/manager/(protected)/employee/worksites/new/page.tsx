"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { GpsInfo } from "@/lib/gps";
import WorksiteGpsPicker from "../worksite-gps-picker";
import { SaveIcon } from "@/components/icons/save-icon";
import AlertModal from "@/components/modals/alert-modal";
import ProcessingModal from "@/components/modals/processing-modal";

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

export default function WorksiteNewPage() {
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [gpsInfo, setGpsInfo] = useState<GpsInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const router = useRouter();

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
    if (saving) return;
    setError("");

    if (!gpsInfo) {
      setError("GPS정보를 입력하거나 지도에서 위치를 선택하세요.");
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);

    try {
      await postJson<WorksiteResponse>("/api/worksites", {
        name: data.get("name"),
        address,
        gpsInfo,
        radiusMeters: data.get("radiusMeters"),
      });

      setAlertMessage("자료를 저장하였습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청을 처리하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">근무지등록</h1>
        <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground mt-2 max-w-[37.5rem]">
          근무지명, 주소, 실제 GPS정보, 허용 반경을 입력해 근무지를 등록합니다.
        </p>
      </header>

      <section className="bg-muted/40 rounded-xl p-[2rem] border border-border/50">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-name">
                근무지명
              </label>
              <Input className="w-full" id="worksite-name" name="name" placeholder="작업장 이름을 입력하세요." required />
            </div>
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-address">
                근무지주소
              </label>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8.25rem]">
                <Input
                  className="w-full"
                  id="worksite-address"
                  name="address"
                  value={address}
                  placeholder="주소 검색으로 선택하세요."
                  readOnly
                  required
                />
                <Button className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full whitespace-nowrap md:w-full" type="button" onClick={openAddressPopup} variant="outline">
                  주소 검색
                </Button>
              </div>
            </div>
            <WorksiteGpsPicker address={address} value={gpsInfo} onChange={setGpsInfo} />
            <div className="space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="worksite-radius">
                허용반경(m)
              </label>
              <Input className="w-full" id="worksite-radius" name="radiusMeters" placeholder="100" required />
            </div>
          </div>

          <Button
            aria-label="저장"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
            data-testid="worksite-submit"
            disabled={saving}
            type="submit"
          >
            <SaveIcon size={20} />
          </Button>
        </form>

        {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p> : null}
      </section>

      <ProcessingModal isOpen={saving} message="저장처리중입니다..." />

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
