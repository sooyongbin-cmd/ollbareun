import Image from "next/image";
import { createElement, type ReactNode } from "react";
import styles from "./homepage-additions.module.css";

export const qualifications = [
  { name: "사업자등록증", src: "/homepage/qualifications/business.jpg" },
  { name: "사회적기업인증서", src: "/homepage/certificate-figma-3.png" },
  { name: "여성기업확인서", src: "/homepage/certificate-figma-1.png" },
  { name: "김해공항세관등록증", src: "/homepage/qualifications/gimhae-airport-customs.jpg" },
  { name: "ISO 9001", src: "/homepage/qualifications/iso-9001.jpg" },
  { name: "ISO 14001", src: "/homepage/qualifications/iso-14001.jpg" },
  { name: "ISO 45001", src: "/homepage/qualifications/iso-45001.jpg" },
  { name: "경비업허가증", src: "/homepage/qualifications/security.jpg" },
  { name: "영업신고증", src: "/homepage/qualifications/hygiene.jpg" },
  { name: "근로자파견업허가증", src: "/homepage/qualifications/dispatch.jpg" },
  { name: "소독업신고증", src: "/homepage/qualifications/disinfection.jpg" },
];

// The browser upgrades this element independently of Next.js hydration.
function CertificateGallery({ children }: { children: ReactNode }) {
  return createElement("olbareum-certificates", { className: styles.gallery }, children);
}

export default function HomepageQualifications() {
  return (
    <section id="qualifications" className={styles.qualifications} aria-labelledby="qualifications-title">
      <div className={styles.qualificationHeading}>
        <h2 id="qualifications-title">검증된 자격으로 완성하는 올바른 공간 솔루션</h2>
        <p>검증된 전문성과 사회적 가치를 담아 누구나 안심하고<br />함께할 수 있는 올바른 공간을 만들어 갑니다.</p>
      </div>
      <CertificateGallery>
        <div className={styles.certificateViewport}>
          <div className={styles.certificateTrack} data-certificate-track="" data-paused="false" suppressHydrationWarning>
            {[0, 1].map((copy) => (
              <div key={copy} className={styles.certificateGroup} aria-hidden={copy === 1 ? true : undefined}>
                {qualifications.map(({ name, src }, index) => (
                  <a
                    key={name}
                    href={src}
                    className={styles.certificateButton}
                    data-certificate={index}
                    aria-label={`${name} 확대 보기`}
                    aria-haspopup="dialog"
                    tabIndex={copy === 1 ? -1 : undefined}
                  >
                    <Image src={src} alt={name} width={212} height={300} sizes="(max-width: 640px) 140px, 212px" />
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <dialog className={styles.certificateModal} role="dialog" aria-modal="true">
          <h3 className={styles.srOnly} />
          <span className={styles.modalCounter} data-counter="" aria-live="polite" />
          <button type="button" data-action="zoom-out" className={styles.modalZoomOut} aria-label="자격증 축소">
            <Image src="/homepage/fontawesome/magnifying-glass-minus.svg" alt="" width={18} height={18} />
          </button>
          <button type="button" data-action="zoom-in" className={styles.modalZoomIn} aria-label="자격증 확대">
            <Image src="/homepage/fontawesome/magnifying-glass-plus.svg" alt="" width={18} height={18} />
          </button>
          <button type="button" data-action="close" className={styles.modalClose} aria-label="자격증 모달 닫기">×</button>
          <button type="button" data-action="previous" className={styles.modalPrevious} aria-label="이전 자격증">
            <Image src="/homepage/fontawesome/circle-arrow-left.svg" alt="" width={28} height={28} />
          </button>
          <div className={styles.modalImageViewport} data-image-viewport="">
            <button type="button" data-action="close-image" className={styles.modalImageButton}>
              {/* The viewer assigns the selected original only when it opens. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" width={886} height={1253} />
            </button>
          </div>
          <button type="button" data-action="next" className={styles.modalNext} aria-label="다음 자격증">
            <Image src="/homepage/fontawesome/circle-arrow-right.svg" alt="" width={28} height={28} />
          </button>
        </dialog>
      </CertificateGallery>
      <script async src="/homepage/certificate-viewer.js" />
    </section>
  );
}
