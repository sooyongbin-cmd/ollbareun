"use client";

import { MicIcon, SquareIcon } from "lucide-react";
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [content, setContent] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [cameraStatus, setCameraStatus] = useState("카메라를 준비하고 있습니다.");
  const [listening, setListening] = useState(false);
  const [savingProvider, setSavingProvider] = useState<"resend" | "formspree" | null>(null);
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

  async function handleReport(provider: "resend" | "formspree") {
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
    try {
      const endpoint =
        provider === "formspree"
          ? "/api/guard/special-remarks/report/formspree"
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
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "특이사항 보고를 전송하지 못했습니다.");
      }

      setAlertMessage("특이사항 보고가 전송되었습니다.");
      setContent("");
      setPhotoDataUrl("");
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "특이사항 보고를 전송하지 못했습니다.");
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
      <div className="max-w-[600px] mx-auto space-y-6">
        <header>
          <h1 className="text-[36px] font-semibold leading-[1.1]">특이사항</h1>
          <p className="mt-2 text-[18px] text-ink-muted-48">근무 중 확인한 특이사항을 작성하고 관리자에게 보고합니다.</p>
        </header>

        <section className="bg-canvas-parchment rounded-[18px] p-[24px] border border-hairline/50 space-y-5">
          <div className="space-y-2">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="special-remark-content">
              특이사항 내용
            </label>
            <textarea
              className="field min-h-[160px] resize-y"
              id="special-remark-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="특이사항 내용을 입력하세요."
            />
          </div>

          <button className="button-secondary w-full justify-center gap-2" onClick={handleSpeech} type="button">
            {listening ? <SquareIcon size={18} /> : <MicIcon size={18} />}
            {listening ? "음성 중지" : "음성 입력"}
          </button>
        </section>

        <section className="bg-canvas-parchment rounded-[18px] p-[24px] border border-hairline/50 space-y-5">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full rounded-[12px] border border-hairline bg-ink object-cover"
            muted
            playsInline
          />
          <p className="text-[14px] font-semibold text-ink-muted-48">{cameraStatus}</p>
          {photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="촬영된 첨부사진" className="w-full rounded-[12px] border border-hairline" src={photoDataUrl} />
          ) : null}
          {error ? <p className="status-warn">{error}</p> : null}
          <button className="button-secondary w-full justify-center" onClick={handleCapture} type="button">
            촬영
          </button>
          <button
            className="button-primary w-full justify-center disabled:opacity-50"
            disabled
            onClick={() => handleReport("resend")}
            type="button"
          >
            이메일보고(resend)
          </button>
          <button
            className="button-primary w-full justify-center disabled:opacity-50"
            disabled={saving || !content.trim()}
            onClick={() => handleReport("formspree")}
            type="button"
          >
            {savingProvider === "formspree" ? "보고 중..." : "이메일(Formspree)"}
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
