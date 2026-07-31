"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import styles from "./page.module.css";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const errorMessages: Record<string, string> = {
  "not-allowed": "마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.",
  "service-not-allowed": "이 브라우저에서 음성 인식 서비스를 사용할 수 없습니다.",
  "audio-capture": "사용할 수 있는 마이크를 찾지 못했습니다.",
  "no-speech": "음성이 들리지 않았습니다. 다시 녹음해주세요.",
  network: "음성 인식 서비스에 연결하지 못했습니다.",
};

export default function VoiceRecorder() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [status, setStatus] = useState("녹음 버튼을 누르고 말씀해주세요.");

  useEffect(() => {
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      queueMicrotask(() => {
        setIsSupported(false);
        setStatus("이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 또는 Edge에서 이용해주세요.");
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "ko-KR";

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("듣고 있습니다. 자연스럽게 말씀해주세요.");
    };

    recognition.onresult = (event) => {
      let confirmed = "";
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          confirmed += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (confirmed) {
        setFinalTranscript((current) =>
          [current, confirmed.trim()].filter(Boolean).join(" "),
        );
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      setStatus(errorMessages[event.error] ?? "음성 인식 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      setStatus((current) =>
        current.startsWith("듣고 있습니다")
          ? "녹음이 완료되었습니다. 다시 녹음하면 텍스트가 이어서 추가됩니다."
          : current,
      );
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  function toggleRecording() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      setStatus("녹음을 마치는 중입니다.");
      recognition.stop();
      return;
    }

    setInterimTranscript("");
    try {
      recognition.start();
    } catch {
      setStatus("녹음을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  const displayedTranscript = [finalTranscript, interimTranscript]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={styles.recorder} aria-labelledby="recorder-title">
      <div className={styles.sectionHeading}>
        <div>
          <p>Speech to text</p>
          <h2 id="recorder-title">음성 텍스트 변환</h2>
        </div>
        <button
          className={`${styles.recordButton} ${isListening ? styles.recording : ""}`}
          type="button"
          onClick={toggleRecording}
          disabled={!isSupported}
          aria-pressed={isListening}
        >
          {isListening ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
          {isListening ? "녹음 중지" : "녹음"}
        </button>
      </div>

      <p className={styles.status} role="status">
        <span className={isListening ? styles.liveDot : styles.idleDot} aria-hidden="true" />
        {status}
      </p>

      <div
        className={`${styles.transcript} ${displayedTranscript ? styles.hasText : ""}`}
        aria-label="변환된 텍스트"
        aria-live="polite"
      >
        {displayedTranscript || "말한 내용이 이곳에 표시됩니다."}
      </div>
    </section>
  );
}
