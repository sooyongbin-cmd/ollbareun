import type { Metadata } from "next";
import { AboutPage } from "../../homepage-pages";
import styles from "../../page.module.css";

export const metadata: Metadata = {
  title: "올바름 소개 | 주식회사 올바름",
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <>
      <AboutPage />
      <style>{`
        #top .${styles.socialGrid} article {
          border: 1px solid var(--home-line);
          border-radius: 1.625rem;
          box-shadow: none;
        }
        @media (max-width: 47.9375rem) {
          #top .${styles.socialGrid} article {
            border-color: #d1d1d1;
            border-radius: 0.75rem;
          }
        }
      `}</style>
      <script async src="/about-company-stats.js" />
    </>
  );
}
