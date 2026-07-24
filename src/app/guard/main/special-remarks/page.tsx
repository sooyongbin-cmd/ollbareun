"use client";

import { BellIcon, MicIcon, SquareIcon, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GuardNoticeDialog } from "@/components/guard/guard-notice-dialog";
import { GuardPageHeader } from "@/components/guard/guard-page-header";
import { GuardActionButton } from "@/components/guard/guard-action-button";
import { GuardStatusAlert } from "@/components/guard/guard-status-alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readStoredGuardSession } from "../../guard-session-storage";

type GuardSession = {
  employee?: {
    id?: string;
    name?: string;
  };
  worksite?: {
    id?: string;
    name?: string;
  };
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognition = EventTarget & {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

const MAX_PHOTO_BYTES = 500 * 1024;
const PHOTO_COMPRESSION_ATTEMPTS = [
  { maxSide: 1280, quality: 0.82 },
  { maxSide: 1024, quality: 0.78 },
  { maxSide: 900, quality: 0.74 },
  { maxSide: 800, quality: 0.7 },
  { maxSide: 720, quality: 0.66 },
  { maxSide: 640, quality: 0.62 },
];

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

async function startCamera(video: HTMLVideoElement) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("카메라를 사용할 수 없습니다.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

function getDataUrlSizeBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

function captureCompressedPhoto(video: HTMLVideoElement) {
  const sourceWidth = video.videoWidth || 1280;
  const sourceHeight = video.videoHeight || 960;
  const sourceMaxSide = Math.max(sourceWidth, sourceHeight);

  for (const attempt of PHOTO_COMPRESSION_ATTEMPTS) {
    const scale = Math.min(1, attempt.maxSide / sourceMaxSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("사진을 촬영하지 못했습니다.");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", attempt.quality);

    if (getDataUrlSizeBytes(dataUrl) <= MAX_PHOTO_BYTES) {
      return dataUrl;
    }
  }

  throw new Error("첨부사진은 500KB 이하로 촬영해주세요.");
}

export default function GuardSpecialRemarksPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [content, setContent] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [cameraStatus, setCameraStatus] = useState("카메라를 준비하고 있습니다.");
  const [listening, setListening] = useState(false);
  const [savingProvider, setSavingProvider] = useState<"resend" | "formspree" | "naver" | "push" | null>(null);
  const [error, setError] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const saving = savingProvider !== null;

  useEffect(() => {
    let cancelled = false;

    async function prepareCamera() {
      if (!videoRef.current) {
        return;
      }

      try {
        const stream = await startCamera(videoRef.current);
        if (!cancelled) {
          streamRef.current = stream;
          setCameraStatus("촬영 버튼을 눌러 첨부사진을 저장하세요.");
        }
      } catch (cameraError) {
        if (!cancelled) {
          setCameraStatus("카메라를 사용할 수 없습니다.");
          setError(cameraError instanceof Error ? cameraError.message : "카메라를 사용할 수 없습니다.");
        }
      }
    }

    void prepareCamera();

    return () => {
      cancelled = true;
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function handleSpeech() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("이 브라우저는 음성 입력을 지원하지 않습니다. 텍스트를 직접 입력해주세요.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        setContent((current) => (current ? `${current}\n${transcript}` : transcript));
      }
    };
    recognition.onerror = () => {
      setError("음성을 인식하지 못했습니다. 다시 시도해주세요.");
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    setListening(true);
    setError("");
    recognition.start();
  }

  function handleCapture() {
    if (!videoRef.current) {
      setError("카메라가 준비되지 않았습니다.");
      return;
    }

    try {
      setPhotoDataUrl(captureCompressedPhoto(videoRef.current));
      setCameraStatus("사진이 촬영되었습니다.");
      setError("");
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "사진을 촬영하지 못했습니다.");
    }
  }

  async function handleReport(provider: "resend" | "formspree" | "naver" | "push") {
    const activeSession = readStoredGuardSession<GuardSession>({ touch: true });
    const employeeId = activeSession?.employee?.id;
    const employeeName = activeSession?.employee?.name;
    const worksiteId = activeSession?.worksite?.id;
    const worksiteName = activeSession?.worksite?.name;

    if (!employeeId || !employeeName || !worksiteName) {
      setError("점검자 또는 근무지 정보가 없습니다.");
      return;
    }

    setSavingProvider(provider);
    setError("");

    let gpsInfo = null;
    if (typeof window !== "undefined" && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 6000,
          });
        });
        gpsInfo = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (gpsError) {
        console.warn("GPS 정보를 가져오지 못했습니다. GPS 없이 보고서를 제출합니다.", gpsError);
      }
    }

    try {
      const endpoint =
        provider === "formspree"
          ? "/api/guard/special-remarks/report/formspree"
          : provider === "naver"
            ? "/api/guard/special-remarks/report/naver"
            : provider === "push"
              ? "/api/guard/special-remarks/report/push"
            : "/api/guard/special-remarks/report";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          employeeName,
          worksiteId,
          worksiteName,
          content,
          photoDataUrl,
          gpsInfo,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "특이사항 보고를 전송하지 못했습니다.");
      }

      if (provider === "push") {
        const delivery = payload.delivery as
          | {
              successCount?: number;
              failedCount?: number;
              unregisteredCount?: number;
              error?: string;
            }
          | undefined;

        if (delivery?.error) {
          setAlertMessage(
            `특이사항 보고는 저장되었지만 관리자 푸시알림 전송에 실패했습니다. ${delivery.error}`,
          );
        } else {
          setAlertMessage(
            `특이사항 보고가 저장되었습니다. 푸시 전송 성공 ${delivery?.successCount ?? 0}건, 실패 ${delivery?.failedCount ?? 0}건, 미등록 관리자 ${delivery?.unregisteredCount ?? 0}명입니다.`,
          );
        }
      } else {
        setAlertMessage("특이사항 보고가 전송되었습니다.");
      }
      setContent("");
      setPhotoDataUrl("");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "특이사항 보고를 전송하지 못했습니다.");
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <div className="w-full space-y-6">
      <GuardPageHeader
        title="특이사항 보고"
        description="근무 중 확인한 특이사항을 작성하고 관리자에게 보고합니다."
      />

      {/* Report Content Card */}
      <Card className="w-full shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">보고 내용 작성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="special-remark-content">특이사항 내용</Label>
            <Textarea
              id="special-remark-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="현재 위치와 함께 특이사항을 입력하세요."
              className="min-h-[140px]"
              aria-invalid={Boolean(error && !content.trim())}
            />
          </div>

          <GuardActionButton
            variant="outline"
            onClick={handleSpeech}
            icon={listening ? <SquareIcon className="size-4" /> : <MicIcon className="size-4" />}
          >
            {listening ? "음성 중지" : "음성 입력"}
          </GuardActionButton>
        </CardContent>
      </Card>

      {/* Camera & Photo Preview Card */}
      <Card className="w-full shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Camera className="size-4 text-primary" />
            <span>현장 사진 첨부</span>
          </CardTitle>
          <CardDescription className="text-xs">{cameraStatus}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Frame */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-black">
            <video
              ref={videoRef}
              aria-label="현장 촬영 카메라 화면"
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          </div>

          {/* Captured Photo Preview */}
          {photoDataUrl && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">촬영된 사진 미리보기</Label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="촬영된 첨부사진"
                className="w-full rounded-lg border object-cover max-h-[240px]"
                src={photoDataUrl}
              />
            </div>
          )}

          {error && (
            <GuardStatusAlert status="error" title="보고 오류" description={error} />
          )}

          <GuardActionButton
            variant="outline"
            onClick={handleCapture}
            icon={<Camera className="size-4" />}
          >
            촬영
          </GuardActionButton>

          {/* Delivery Channel Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-border/40">
            <Label className="text-xs text-muted-foreground">보고서 전송 채널 선택</Label>
            
            <GuardActionButton
              disabled
              onClick={() => handleReport("resend")}
            >
              이메일보고(resend)
            </GuardActionButton>

            <GuardActionButton
              disabled={saving || !content.trim()}
              isLoading={savingProvider === "formspree"}
              loadingText="보고 중..."
              onClick={() => handleReport("formspree")}
            >
              이메일(Formspree)
            </GuardActionButton>

            <GuardActionButton
              disabled={saving || !content.trim()}
              isLoading={savingProvider === "naver"}
              loadingText="보고 중..."
              onClick={() => handleReport("naver")}
            >
              이메일(NAVER)
            </GuardActionButton>

            <GuardActionButton
              disabled={saving || !content.trim()}
              isLoading={savingProvider === "push"}
              loadingText="전송 중..."
              onClick={() => handleReport("push")}
              icon={<BellIcon className="size-4" />}
            >
              푸쉬알림
            </GuardActionButton>
          </div>
        </CardContent>
      </Card>

      <GuardNoticeDialog
        open={Boolean(alertMessage)}
        onOpenChange={(open) => {
          if (!open) {
            setAlertMessage("");
            router.push("/guard/main");
          }
        }}
        title="알림"
        description={alertMessage}
        onConfirm={() => {
          setAlertMessage("");
          router.push("/guard/main");
        }}
      />
    </div>
  );
}
