"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { parseInspectionQrPayload, type InspectionQrPayload } from "@/lib/inspection";
import { GuardNoticeDialog } from "@/components/guard/guard-notice-dialog";
import { GuardPageHeader } from "@/components/guard/guard-page-header";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import { GuardStatusAlert } from "@/components/guard/guard-status-alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
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
    <div className="w-full space-y-6">
      <GuardPageHeader
        title="현장점검 (QR코드)"
        description="현장 QR을 스캔한 뒤 촬영 버튼으로 점검을 저장합니다."
      />

      <Card className="w-full shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Camera className="size-4 text-primary" />
            <span>QR 스캐너</span>
          </CardTitle>
          <CardDescription className="text-xs">{status}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Camera Video Frame */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-black">
            <video
              ref={videoRef}
              aria-label="QR 스캔 카메라 화면"
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          </div>

          {/* QR Scanned Information */}
          {qrPayload && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm">{qrPayload.siteName}</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {qrPayload.worksiteName}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                위치 좌표: {qrPayload.gpsInfo.latitude.toFixed(6)}, {qrPayload.gpsInfo.longitude.toFixed(6)}
              </p>
            </div>
          )}

          {error && (
            <GuardStatusAlert
              status="error"
              title="스캔 오류"
              description={error}
            />
          )}

          <GuardActionButton
            disabled={!qrPayload || saving}
            isLoading={saving}
            loadingText="저장 중..."
            onClick={handleCapture}
            icon={<Camera className="size-4" />}
          >
            촬영
          </GuardActionButton>
        </CardContent>
      </Card>

      <GuardNoticeDialog
        open={Boolean(alertMessage)}
        onOpenChange={(open) => {
          if (!open) setAlertMessage("");
        }}
        title="알림"
        description={alertMessage}
        onConfirm={() => setAlertMessage("")}
      />
    </div>
  );
}
