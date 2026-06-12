"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildInspectionQrPayload,
  parseInspectionQrPayload,
  type InspectionQrPayload,
  type InspectionSiteRow,
} from "@/lib/inspection";
import AlertModal from "@/components/modals/alert-modal";

type GuardSession = {
  employee?: {
    id?: string;
    name?: string;
  };
};

type NfcRecord = {
  recordType?: string;
  data?: ArrayBuffer | ArrayBufferView | string | null;
};

type NfcReadingEvent = {
  message?: {
    records?: NfcRecord[];
  };
};

type NfcReader = {
  scan: () => Promise<void>;
  onreading: ((event: NfcReadingEvent) => void) | null;
  onreadingerror?: (() => void) | null;
};

type NfcWindow = Window &
  typeof globalThis & {
    NDEFReader?: new () => NfcReader;
  };

type InspectionSource =
  | { type: "payload"; value: string }
  | { type: "site"; value: string };

function loadGuardSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.sessionStorage.getItem("ollbareun.guard.session");
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as GuardSession;
  } catch {
    return null;
  }
}

async function postInspectionLog(input: {
  employeeId: string;
  employeeName: string;
  qrPayload: InspectionQrPayload;
}) {
  const response = await fetch("/api/inspection/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "현장점검을 저장하지 못했습니다.");
  }

  return payload;
}

async function fetchInspectionSitePayload(siteId: string) {
  const response = await fetch(`/api/inspection/sites/${encodeURIComponent(siteId)}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "점검 위치 정보를 불러오지 못했습니다.");
  }

  return buildInspectionQrPayload(payload.site as InspectionSiteRow);
}

function decodeRecordData(data: NfcRecord["data"]) {
  if (typeof data === "string") {
    return data;
  }

  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  }

  if (data && typeof data === "object" && "byteLength" in data) {
    return new TextDecoder().decode(data as ArrayBuffer);
  }

  return "";
}

function extractSourceFromText(value: string): InspectionSource {
  const trimmed = value.trim();

  try {
    const url = new URL(trimmed, window.location.origin);
    const payload = url.searchParams.get("payload");
    if (payload) {
      return { type: "payload", value: payload };
    }

    const siteId = url.searchParams.get("s");
    if (siteId) {
      return { type: "site", value: siteId };
    }

    return { type: "payload", value: trimmed };
  } catch {
    return { type: "payload", value: trimmed };
  }
}

function extractSourceFromReading(event: NfcReadingEvent) {
  const records = event.message?.records ?? [];

  for (const record of records) {
    const text = decodeRecordData(record.data);
    if (text) {
      return extractSourceFromText(text);
    }
  }

  return null;
}

function getInitialSourceFromUrl(): InspectionSource | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URL(window.location.href).searchParams;
  const payload = params.get("payload");
  if (payload) {
    return { type: "payload", value: payload };
  }

  const siteId = params.get("s");
  if (siteId) {
    return { type: "site", value: siteId };
  }

  return null;
}

function getInitialStatus() {
  if (typeof window !== "undefined" && !getInitialSourceFromUrl() && !("NDEFReader" in window)) {
    return "이 브라우저에서는 NFC 태그 읽기를 사용할 수 없습니다.";
  }

  return "NFC 태그를 가까이 대세요.";
}

function clearInitialSourceFromUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (!url.searchParams.has("payload") && !url.searchParams.has("s")) {
    return;
  }

  url.searchParams.delete("payload");
  url.searchParams.delete("s");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function GuardInspectionNfcPage() {
  const [session] = useState<GuardSession | null>(() => loadGuardSession());
  const [nfcPayload, setNfcPayload] = useState<InspectionQrPayload | null>(null);
  const [status, setStatus] = useState(() => getInitialStatus());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const handledPayloadRef = useRef("");

  const saveInspectionPayload = useCallback(
    async (rawPayload: unknown) => {
      const employeeId = session?.employee?.id;
      const employeeName = session?.employee?.name;

      if (!employeeId || !employeeName) {
        setError("점검자 정보가 없습니다.");
        return;
      }

      const payloadKey = typeof rawPayload === "string" ? rawPayload : JSON.stringify(rawPayload);
      if (handledPayloadRef.current === payloadKey) {
        return;
      }

      handledPayloadRef.current = payloadKey;
      setSaving(true);
      setError("");

      try {
        const parsed = parseInspectionQrPayload(rawPayload);
        setNfcPayload(parsed);
        setStatus("NFC 태그가 인식되었습니다.");
        await postInspectionLog({
          employeeId,
          employeeName,
          qrPayload: parsed,
        });
        clearInitialSourceFromUrl();
        setAlertMessage("NFC 태그 점검이 저장되었습니다.");
      } catch (saveError) {
        handledPayloadRef.current = "";
        setError(saveError instanceof Error ? saveError.message : "NFC 태그 점검을 저장하지 못했습니다.");
      } finally {
        setSaving(false);
      }
    },
    [session],
  );

  const saveInspectionSource = useCallback(
    async (source: InspectionSource) => {
      if (source.type === "payload") {
        await saveInspectionPayload(source.value);
        return;
      }

      const payload = await fetchInspectionSitePayload(source.value);
      await saveInspectionPayload(payload);
    },
    [saveInspectionPayload],
  );

  useEffect(() => {
    const initialSource = getInitialSourceFromUrl();
    if (initialSource) {
      queueMicrotask(() => {
        void saveInspectionSource(initialSource);
      });
      return;
    }

    const nfcWindow = window as NfcWindow;
    if (!nfcWindow.NDEFReader) {
      return;
    }

    const reader = new nfcWindow.NDEFReader();
    reader.onreading = (event) => {
      const source = extractSourceFromReading(event);
      if (!source) {
        setError("NFC 태그 내용을 읽을 수 없습니다.");
        return;
      }
      void saveInspectionSource(source);
    };
    reader.onreadingerror = () => {
      setError("NFC 태그를 읽지 못했습니다. 다시 태그해주세요.");
    };

    reader
      .scan()
      .then(() => setStatus("NFC 태그를 가까이 대세요."))
      .catch((scanError) => {
        setStatus("NFC 태그 읽기를 시작하지 못했습니다.");
        setError(scanError instanceof Error ? scanError.message : "NFC 태그 읽기를 시작하지 못했습니다.");
      });
  }, [saveInspectionSource]);

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <div className="max-w-[600px] mx-auto space-y-6">
        <header>
          <h1 className="text-[36px] font-semibold leading-[1.1]">순찰(NFC태그)</h1>
          <p className="mt-2 text-[18px] text-ink-muted-48">NFC 스티커를 태그하면 점검 기록을 저장합니다.</p>
        </header>

        <section className="bg-canvas-parchment rounded-[18px] p-[24px] border border-hairline/50 space-y-5">
          <div className="rounded-[12px] border border-hairline/50 bg-canvas p-4 space-y-2">
            <p className="text-[14px] font-semibold text-ink-muted-48">{saving ? "저장 중..." : status}</p>
            {nfcPayload ? (
              <div className="grid gap-1 text-[15px]">
                <span className="font-semibold">{nfcPayload.siteName}</span>
                <span className="text-ink-muted-48">{nfcPayload.worksiteName}</span>
                <span className="text-ink-muted-48">
                  {nfcPayload.gpsInfo.latitude.toFixed(6)}, {nfcPayload.gpsInfo.longitude.toFixed(6)}
                </span>
              </div>
            ) : null}
            {error ? <p className="status-warn">{error}</p> : null}
          </div>
        </section>
      </div>

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => setAlertMessage("")}
        title="알림"
        description={alertMessage}
      />
    </div>
  );
}
