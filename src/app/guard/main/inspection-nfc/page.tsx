"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  buildInspectionQrPayload,
  parseInspectionQrPayload,
  type InspectionQrPayload,
  type InspectionSiteRow,
  type InspectionLogRow,
} from "@/lib/inspection";
import AlertModal from "@/components/modals/alert-modal";
import { readStoredGuardSession, readStoredGuardSessionSnapshot, subscribeToGuardSessionChange } from "../../guard-session-storage";

type GuardSession = {
  employee?: {
    id?: string;
    name?: string;
    role?: string;
  };
  worksite?: { id?: string };
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
  const storedSession = useSyncExternalStore(subscribeToGuardSessionChange, readStoredGuardSessionSnapshot, () => null);
  let session: GuardSession | null = null;
  try { session = storedSession ? JSON.parse(storedSession) as GuardSession : null; } catch { /* Invalid session. */ }
  const employeeId = session?.employee?.id;
  const worksiteId = session?.worksite?.id;
  const title = session?.employee?.role === "미화원" ? "청소구역(NFC태그)" : "순찰(NFC태그)";
  const [siteList, setSiteList] = useState<{ key: string; sites: InspectionSiteRow[]; completed: string[]; error: string } | null>(null);
  const [savedSites, setSavedSites] = useState<string[]>([]);
  const listKey = `${employeeId}:${worksiteId}`;
  const currentList = siteList?.key === listKey ? siteList : null;

  useEffect(() => {
    if (!employeeId || !worksiteId) return;
    const controller = new AbortController();
    async function loadSites() {
      try {
        const [siteResponse, logResponse] = await Promise.all([
          fetch("/api/inspection/sites", { cache: "no-store", signal: controller.signal }),
          fetch(`/api/inspection/logs?worksiteId=${encodeURIComponent(worksiteId!)}`, { cache: "no-store", signal: controller.signal }),
        ]);
        if (!siteResponse.ok || !logResponse.ok) throw new Error("현장 점검 목록을 불러오지 못했습니다.");
        const siteData = await siteResponse.json() as { sites: InspectionSiteRow[] };
        const logData = await logResponse.json() as { logs: InspectionLogRow[] };
        const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const completed = logData.logs.filter((log) => {
          const time = new Date(log.inspected_at).getTime();
          return log.employee_id === employeeId && log.worksite_id === worksiteId && Number.isFinite(time) &&
            new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) === today;
        }).flatMap((log) => log.inspection_site_id ? [log.inspection_site_id] : []);
        if (!controller.signal.aborted) setSiteList({ key: listKey, sites: siteData.sites.filter((site) => site.worksite_id === worksiteId), completed, error: "" });
      } catch {
        if (!controller.signal.aborted) setSiteList({ key: listKey, sites: [], completed: [], error: "현장 점검 목록을 불러오지 못했습니다." });
      }
    }
    void loadSites();
    return () => controller.abort();
  }, [employeeId, worksiteId, listKey]);
  const [nfcPayload, setNfcPayload] = useState<InspectionQrPayload | null>(null);
  const [status, setStatus] = useState(() => getInitialStatus());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const handledPayloadRef = useRef("");

  const saveInspectionPayload = useCallback(
    async (rawPayload: unknown) => {
      const activeSession = readStoredGuardSession<GuardSession>({ touch: true });
      const employeeId = activeSession?.employee?.id;
      const employeeName = activeSession?.employee?.name;

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
        setSavedSites((sites) => [...sites, `${employeeId}:${parsed.worksiteId}:${parsed.siteId}`]);
        clearInitialSourceFromUrl();
        setAlertMessage("NFC 태그 점검이 저장되었습니다.");
      } catch (saveError) {
        handledPayloadRef.current = "";
        setError(saveError instanceof Error ? saveError.message : "NFC 태그 점검을 저장하지 못했습니다.");
      } finally {
        setSaving(false);
      }
    },
    [],
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

  function handleSuccessAlertClose() {
    setAlertMessage("");
    window.history.go(0);
  }

  return (
    <div className="mx-auto max-w-[61.25rem] w-full px-5 py-[5rem]">
      <div className="max-w-[37.5rem] mx-auto space-y-6">
        <header>
          <h1 className="text-[2.25rem] font-semibold leading-[1.1]">{title}</h1>
          <p className="mt-2 text-[1.125rem] text-muted-foreground">NFC 스티커를 태그하면 점검 기록을 저장합니다.</p>
        </header>

        <section className="bg-muted/40 rounded-xl p-[1.5rem] border border-border/50 space-y-5">
          <div className="rounded-[0.75rem] border border-border/50 bg-background p-4 space-y-2">
            <p className="text-[0.875rem] font-semibold text-muted-foreground">{saving ? "저장 중..." : status}</p>
            {nfcPayload ? (
              <div className="grid gap-1 text-[0.9375rem]">
                <span className="font-semibold">{nfcPayload.siteName}</span>
                <span className="text-muted-foreground">{nfcPayload.worksiteName}</span>
                <span className="text-muted-foreground">
                  {nfcPayload.gpsInfo.latitude.toFixed(6)}, {nfcPayload.gpsInfo.longitude.toFixed(6)}
                </span>
              </div>
            ) : null}
            {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
          </div>
        </section>
        <section aria-label="NFC체크포인트 목록" className="bg-muted/40 rounded-xl p-6 border border-border/50">
          <h2 className="font-semibold mb-4">NFC체크포인트</h2>
          {!worksiteId || !employeeId ? <p>배정된 근무지 정보가 없습니다.</p>
            : !currentList ? <p role="status">현장 목록을 불러오는 중입니다.</p>
            : currentList.error ? <p role="alert">{currentList.error}</p>
            : currentList.sites.length === 0 ? <p>등록된 현장이 없습니다.</p>
            : <ul className="divide-y divide-border">
              {currentList.sites.map((site) => (
                <li key={site.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 break-words">{site.name}</span>
                  {(currentList.completed.includes(site.id) || savedSites.includes(`${listKey}:${site.id}`)) && <span className="shrink-0 text-sm font-semibold text-primary">점검완료</span>}
                </li>
              ))}
            </ul>}
        </section>
      </div>

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={handleSuccessAlertClose}
        title="알림"
        description={alertMessage}
      />
    </div>
  );
}
