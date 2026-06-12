"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { parseInspectionQrPayload, type InspectionQrPayload } from "@/lib/inspection";
import AlertModal from "@/components/modals/alert-modal";
import { readStoredGuardSession } from "../../guard-session-storage";

type GuardSession = {
  employee?: {
    id?: string;
    name?: string;
  };
};

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

export default function GuardInspectionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [qrPayload, setQrPayload] = useState<InspectionQrPayload | null>(null);
  const [status, setStatus] = useState("카메라를 준비하고 있습니다.");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserQRCodeReader();

    async function startScan() {
      if (!videoRef.current) {
        return;
      }

      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, scanError, callbackControls) => {
            if (cancelled || !result) {
              return;
            }

            try {
              const parsed = parseInspectionQrPayload(result.getText());
              setQrPayload(parsed);
              setStatus("QR 코드가 인식되었습니다.");
              setError("");
              callbackControls.stop();
            } catch (parseError) {
              setError(parseError instanceof Error ? parseError.message : "QR 코드를 읽을 수 없습니다.");
            }

            if (scanError) {
              setStatus("QR 코드를 찾는 중입니다.");
            }
          },
        );

        if (!cancelled) {
          controlsRef.current = controls;
          setStatus("QR 코드를 카메라에 비춰주세요.");
        }
      } catch (cameraError) {
        if (!cancelled) {
          setError(cameraError instanceof Error ? cameraError.message : "카메라를 시작하지 못했습니다.");
          setStatus("카메라를 사용할 수 없습니다.");
        }
      }
    }

    void startScan();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  async function handleCapture() {
    const activeSession = readStoredGuardSession<GuardSession>({ touch: true });
    const employeeId = activeSession?.employee?.id;
    const employeeName = activeSession?.employee?.name;

    if (!employeeId || !employeeName || !qrPayload) {
      setError("점검자 정보 또는 QR 정보가 없습니다.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await postInspectionLog({
        employeeId,
        employeeName,
        qrPayload,
      });
      setAlertMessage("현장점검이 저장되었습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "현장점검을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <div className="max-w-[600px] mx-auto space-y-6">
        <header>
          <h1 className="text-[36px] font-semibold leading-[1.1]">현장점검</h1>
          <p className="mt-2 text-[18px] text-ink-muted-48">현장 QR을 스캔한 뒤 촬영 버튼으로 점검을 저장합니다.</p>
        </header>

        <section className="bg-canvas-parchment rounded-[18px] p-[24px] border border-hairline/50 space-y-5">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full rounded-[12px] border border-hairline bg-ink object-cover"
            muted
            playsInline
          />

          <div className="rounded-[12px] border border-hairline/50 bg-canvas p-4 space-y-2">
            <p className="text-[14px] font-semibold text-ink-muted-48">{status}</p>
            {qrPayload ? (
              <div className="grid gap-1 text-[15px]">
                <span className="font-semibold">{qrPayload.siteName}</span>
                <span className="text-ink-muted-48">{qrPayload.worksiteName}</span>
                <span className="text-ink-muted-48">
                  {qrPayload.gpsInfo.latitude.toFixed(6)}, {qrPayload.gpsInfo.longitude.toFixed(6)}
                </span>
              </div>
            ) : null}
            {error ? <p className="status-warn">{error}</p> : null}
          </div>

          <button
            className="button-primary w-full justify-center disabled:opacity-50"
            disabled={!qrPayload || saving}
            onClick={handleCapture}
            type="button"
          >
            촬영
          </button>
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
