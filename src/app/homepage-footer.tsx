import Link from "next/link";
import styles from "./page.module.css";

export default function HomepageFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <strong>올바름 소개</strong>
          <Link href="/about#history">연혁</Link>
          <Link href="/about#values">성장 현황</Link>
          <Link href="/about#contact">Contact Us</Link>
        </div>
        <div>
          <strong>서비스</strong>
          <Link href="/services#dispatch">근로자 파견</Link>
          <Link href="/services#facility">시설물 관리</Link>
          <Link href="/services#disinfection">방역소독</Link>
        </div>
        <div>
          <strong>고객사</strong>
          <Link href="/clients#client-list">공공기관</Link>
          <Link href="/clients#client-list">항공사</Link>
          <Link href="/clients#client-list">교육기관</Link>
        </div>
        <div className={styles.footerConnection}>
          <strong>연결</strong>
          <Link href="/manager">관리자</Link>
          <Link href="/guard">근무자</Link>
        </div>
        <div className={styles.footerInquiry}>
          <strong>문의</strong>
          <a href="tel:0514657767">T.051-465-7767</a>
          <a href="tel:0519617767">F.051-961-7767</a>
          <a href="mailto:olbareum@naver.com">olbareum@naver.com</a>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <p className={styles.footerAddress}>
          <span className={styles.footerAddressLine}>
            부산광역시 강서구 유통단지1로 41, 105동 217・218호
          </span>
          <span className={styles.footerAddressLine}>
            대표이사 윤지욱・사업자등록번호 213-87-01208
          </span>
        </p>
        <p className={styles.footerCopyright}>
          <span>Ⓒ2026 주식회사 올바름. All rights reserved.</span>
          <Link className={styles.footerPrivacyLink} href="/privacy-policy">
            개인정보 처리방침
          </Link>
        </p>
      </div>
    </footer>
  );
}
