"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CameraIcon, CheckIcon, MicIcon, SendIcon, SquareIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AlertModal from "@/components/modals/alert-modal";
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

type CapturedPhoto = {
  id: string;
  dataUrl: string;
  touched: boolean;
  selected: boolean;
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
  const reportingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const photoIdRef = useRef(0);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [cameraStatus, setCameraStatus] = useState("카메라를 준비하고 있습니다.");
  const [listening, setListening] = useState(false);
  const [continuousSpeechEnabled, setContinuousSpeechEnabled] = useState(false);
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

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/guard/configs/special_001", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!controller.signal.aborted && typeof data?.enabled === "boolean") {
          setContinuousSpeechEnabled(data.enabled);
        }
      })
      .catch(() => {});

    return () => controller.abort();
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
    recognition.continuous = continuousSpeechEnabled;
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
      const dataUrl = captureCompressedPhoto(videoRef.current);
      const id = `photo-${photoIdRef.current++}`;
      setPhotos((current) => [...current, { id, dataUrl, touched: false, selected: false }]);
      setCameraStatus("사진이 촬영되었습니다.");
      setError("");
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "사진을 촬영하지 못했습니다.");
    }
  }

  function handlePhotoToggle(photoId: string) {
    setPhotos((current) => current.map((photo) => (
      photo.id === photoId
        ? { ...photo, touched: true, selected: !photo.selected }
        : photo
    )));
  }

  async function handleReport(provider: "resend" | "formspree" | "naver" | "push") {
    if (reportingRef.current) return;
    const activeSession = readStoredGuardSession<GuardSession>({ touch: true });
    const employeeId = activeSession?.employee?.id;
    const employeeName = activeSession?.employee?.name;
    const worksiteId = activeSession?.worksite?.id;
    const worksiteName = activeSession?.worksite?.name;

    if (!employeeId || !employeeName || !worksiteName) {
      setError("점검자 또는 근무지 정보가 없습니다.");
      return;
    }

    reportingRef.current = true;
    setSavingProvider(provider);
    setError("");
    const selectedPhotoDataUrls = photos.filter((photo) => photo.selected).map((photo) => photo.dataUrl);

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
          photoDataUrl: selectedPhotoDataUrls[0] ?? "",
          photoDataUrls: selectedPhotoDataUrls,
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

        const emailMessage = payload.email?.status === "sent"
          ? " NAVER 이메일 보고가 전송되었습니다."
          : " NAVER 이메일 보고에 실패했습니다. " + (payload.email?.error ?? "발송 결과를 확인하지 못했습니다.");

        if (delivery?.error) {
          setAlertMessage(
            `특이사항 보고는 저장되었지만 관리자 푸시알림 전송에 실패했습니다. ${delivery.error}` + emailMessage,
          );
        } else {
          setAlertMessage(
            `특이사항 보고가 저장되었습니다. 푸시 전송 성공 ${delivery?.successCount ?? 0}건, 실패 ${delivery?.failedCount ?? 0}건, 미등록 관리자 ${delivery?.unregisteredCount ?? 0}명입니다.` + emailMessage,
          );
        }
      } else {
        setAlertMessage("특이사항 보고가 전송되었습니다.");
      }
      setContent("");
      setPhotos([]);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "특이사항 보고를 전송하지 못했습니다.");
    } finally {
      reportingRef.current = false;
      setSavingProvider(null);
    }
  }

  return (
    <main className="guard-special-remarks-page">
      <section className="guard-special-remarks-intro-card">
        <h1>특이사항</h1>
        <p>근무 중 특이사항을 작성하여 관리자에게 보고합니다.</p>
      </section>

      <section aria-label="특이사항 입력" className="guard-special-remarks-input-card">
        <div className="guard-special-remarks-input-content">
          <Textarea
            aria-label="특이사항 내용"
            className="guard-special-remarks-textarea"
            id="special-remark-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={'"1층 로비 유리창 깨짐" 처럼 현장 위치와 특이사항을\n말로 편하게 입력하면, 텍스트로 자동 변환되어\n보고서에 반영됩니다.'}
          />
          <Button className="guard-special-remarks-speech-button" onClick={handleSpeech} type="button">
            {listening ? <SquareIcon aria-hidden="true" size={16} /> : <MicIcon aria-hidden="true" size={16} />}
            {listening ? "음성 중지" : "음성 입력"}
          </Button>
        </div>
      </section>

      <section aria-label="첨부사진" className="guard-special-remarks-photo-card">
        <div className="guard-special-remarks-camera-frame">
          <video ref={videoRef} muted playsInline />
        </div>
        <p aria-live="polite" className="guard-sr-only">{cameraStatus}</p>
        <Button className="guard-special-remarks-capture-button" onClick={handleCapture} type="button">
          <CameraIcon aria-hidden="true" size={16} />
          촬영
        </Button>
        <p className="guard-special-remarks-photo-instruction">관리자에게 보고할 사진을 터치하여 선택해 주세요</p>
        {photos.length > 0 ? (
          <div className="guard-special-remarks-photo-list">
            {photos.map((photo, index) => (
              <button
                aria-label={`사진 ${index + 1} ${photo.selected ? "선택 해제" : "선택"}`}
                aria-pressed={photo.selected}
                className="guard-special-remarks-photo-button"
                key={photo.id}
                onClick={() => handlePhotoToggle(photo.id)}
                type="button"
              >
                {/* Runtime camera captures are data URLs and cannot use next/image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={`촬영된 첨부사진 ${index + 1}`} src={photo.dataUrl} />
                {photo.touched ? (
                  <span aria-checked={photo.selected} aria-label={`사진 ${index + 1} 체크`} className={`guard-special-remarks-photo-check ${photo.selected ? "is-selected" : ""}`} role="checkbox">
                    {photo.selected ? <CheckIcon aria-hidden="true" size={15} /> : null}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
        {error ? <p className="guard-special-remarks-error">{error}</p> : null}
      </section>

      <Button
        className="guard-general-button guard-special-remarks-report-button"
        disabled={saving || !content.trim()}
        onClick={() => handleReport("push")}
        type="button"
      >
        <SendIcon aria-hidden="true" size={16} />
        {savingProvider === "push" ? "전송 중..." : "보고하기"}
      </Button>

      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => {
          setAlertMessage("");
          router.push("/guard/main");
        }}
        title="알림"
        description={alertMessage}
      />
    </main>
  );
}
