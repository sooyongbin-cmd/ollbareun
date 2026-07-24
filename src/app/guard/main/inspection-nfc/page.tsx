"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildInspectionQrPayload,
  parseInspectionQrPayload,
  type InspectionQrPayload,
  type InspectionSiteRow,
} from "@/lib/inspection";
import { GuardNoticeDialog } from "@/components/guard/guard-notice-dialog";
import { GuardPageHeader } from "@/components/guard/guard-page-header";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import { GuardStatusAlert } from "@/components/guard/guard-status-alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, QrCode } from "lucide-react";
import { readStoredGuardSession } from "../../guard-session-storage";

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
  const [nfcPayload, setNfcPayload] = useState<InspectionQrPayload | null>(null);
  const [status, setStatus] = useState(() => getInitialStatus());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [nfcSupported] = useState(() => typeof window === "undefined" || "NDEFReader" in window);
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
    <div className="w-full space-y-6">
      <GuardPageHeader
        title="현장점검 (NFC태그)"
        description="NFC 스티커를 태그하면 점검 기록을 저장합니다."
      />

      <Card className="w-full shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Radio className="size-4 text-primary" />
            <span>NFC 리더</span>
          </CardTitle>
          <CardDescription className="text-xs">
            {saving ? "저장 중..." : status}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tag Waiting Illustration Frame */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted/30 flex flex-col items-center justify-center p-6 text-center">
            <Radio className={`size-16 ${saving ? "text-primary animate-pulse" : "text-muted-foreground animate-ping"}`} />
            <p className="mt-4 text-sm font-semibold text-foreground">
              {saving ? "점검 기록을 저장하는 중입니다..." : "휴대폰 뒷면을 NFC 태그에 가까이 대주세요."}
            </p>
          </div>

          {/* NFC Scanned Information */}
          {nfcPayload && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{nfcPayload.siteName}</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {nfcPayload.worksiteName}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                위치 좌표: {nfcPayload.gpsInfo.latitude.toFixed(6)}, {nfcPayload.gpsInfo.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {error && (
            <GuardStatusAlert
              status="error"
              title="NFC 오류"
              description={error}
            />
          )}

          {!nfcSupported && (
            <GuardStatusAlert
              status="warning"
              title="NFC 미지원 안내"
              description={
                <div className="space-y-3 mt-1">
                  <p>현재 기기/브라우저에서는 NFC를 직접 읽을 수 없습니다. QR 코드 점검을 이용해주세요.</p>
                  <GuardActionButton asChild variant="outline">
                    <Link href="/guard/main/inspection">
                      <QrCode className="size-4" />
                      <span>QR코드 점검으로 이동</span>
                    </Link>
                  </GuardActionButton>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>

      <GuardNoticeDialog
        open={Boolean(alertMessage)}
        onOpenChange={(open) => {
          if (!open) handleSuccessAlertClose();
        }}
        title="알림"
        description={alertMessage}
        onConfirm={handleSuccessAlertClose}
      />
    </div>
  );
}
