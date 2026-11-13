"use client";

import Image from "next/image";
import { Dialog } from "radix-ui";
import { useRef, useState, type CSSProperties } from "react";
import styles from "./homepage-additions.module.css";

export const qualifications = [
  { name: "사업자등록증", src: "/homepage/qualifications/business.webp" },
  { name: "사회적기업인증서", src: "/homepage/certificate-figma-3.png" },
  { name: "여성기업확인서", src: "/homepage/certificate-figma-1.png" },
  { name: "김해공항세관등록증", src: "/homepage/certificate-figma-2.png" },
  { name: "ISO 45001", src: "/homepage/qualifications/iso-45001.webp" },
  { name: "경비업허가증", src: "/homepage/qualifications/security.webp" },
  { name: "영업신고증", src: "/homepage/qualifications/hygiene.webp" },
  { name: "근로자파견업허가증", src: "/homepage/qualifications/dispatch.webp" },
  { name: "소독업신고증", src: "/homepage/qualifications/disinfection.webp" },
];

export default function HomepageQualifications() {
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const opener = useRef<HTMLButtonElement | null>(null);
  const certificate = selected === null ? null : qualifications[selected];
  const move = (direction: number) => {
    setZoom(1);
    setSelected((current) =>
      current === null ? null : (current + direction + qualifications.length) % qualifications.length,
    );
  };

  return (
    <section id="qualifications" className={styles.qualifications} aria-labelledby="qualifications-title">
      <div className={styles.qualificationHeading}>
        <h2 id="qualifications-title">검증된 자격으로 완성하는 올바른 공간 솔루션</h2>
        <p>검증된 전문성과 사회적 가치를 담아 누구나 안심하고<br />함께할 수 있는 올바른 공간을 만들어 갑니다.</p>
      </div>
      <Dialog.Root open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <div className={styles.certificateViewport}>
          <div className={styles.certificateTrack} data-paused={selected !== null}>
            {[0, 1].map((copy) => (
              <div key={copy} className={styles.certificateGroup} aria-hidden={copy === 1 ? true : undefined}>
                {qualifications.map(({ name, src }, index) => (
                  <button
                    key={name}
                    type="button"
                    className={styles.certificateButton}
                    aria-label={`${name} 확대 보기`}
                    tabIndex={copy === 1 ? -1 : 0}
                    onClick={(event) => { opener.current = event.currentTarget; setZoom(1); setSelected(index); }}
                  >
                    <Image src={src} alt={name} width={212} height={300} sizes="(max-width: 640px) 140px, 212px" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.modalOverlay} />
          <Dialog.Content
            className={styles.certificateModal}
            aria-describedby={undefined}
            onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
            onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus({ preventScroll: true }); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
              if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
            }}
          >
            <Dialog.Title className={styles.srOnly}>{certificate?.name} 확대 보기</Dialog.Title>
            <span className={styles.modalCounter} aria-live="polite">{selected === null ? 0 : selected + 1} / {qualifications.length}</span>
            <button type="button" className={styles.modalZoomOut} aria-label="자격증 축소" disabled={zoom <= 0.5} onClick={() => setZoom((current) => Math.max(0.5, current - 0.25))}>
              <Image src="/homepage/fontawesome/magnifying-glass-minus.svg" alt="" width={18} height={18} aria-hidden="true" />
            </button>
            <button type="button" className={styles.modalZoomIn} aria-label="자격증 확대" disabled={zoom >= 3} onClick={() => setZoom((current) => Math.min(3, current + 0.25))}>
              <Image src="/homepage/fontawesome/magnifying-glass-plus.svg" alt="" width={18} height={18} aria-hidden="true" />
            </button>
            <Dialog.Close className={styles.modalClose} aria-label="자격증 모달 닫기">×</Dialog.Close>
            <button type="button" className={styles.modalPrevious} aria-label="이전 자격증" onClick={() => move(-1)}>
              <Image src="/homepage/fontawesome/circle-arrow-left.svg" alt="" width={28} height={28} aria-hidden="true" />
            </button>
            <div className={styles.modalImageViewport} style={{ "--certificate-zoom": zoom } as CSSProperties} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
              {certificate ? (
                <Dialog.Close className={styles.modalImageButton} aria-label={`${certificate.name} 이미지 닫기`}>
                  <Image src={certificate.src} alt={certificate.name} width={886} height={1253} sizes="(max-width: 640px) 100vw, 1500px" />
                </Dialog.Close>
              ) : null}
            </div>
            <button type="button" className={styles.modalNext} aria-label="다음 자격증" onClick={() => move(1)}>
              <Image src="/homepage/fontawesome/circle-arrow-right.svg" alt="" width={28} height={28} aria-hidden="true" />
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
