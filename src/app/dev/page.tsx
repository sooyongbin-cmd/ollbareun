import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import VoiceRecorder from "./voice-recorder";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "개발자",
  description: "음성을 텍스트로 변환하는 개발자 도구입니다.",
  alternates: { canonical: "/dev" },
};

export default function DeveloperPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.backLink} href="/">
          <ArrowLeft aria-hidden="true" />
          홈으로
        </Link>

        <header className={styles.header}>
          <p>Developer tools</p>
          <h1>개발자</h1>
          <span>브라우저 음성 인식을 이용해 말한 내용을 텍스트로 확인할 수 있습니다.</span>
        </header>

        <VoiceRecorder />
      </div>
    </main>
  );
}
