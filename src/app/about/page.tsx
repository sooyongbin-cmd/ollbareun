import type { Metadata } from "next";
import { AboutPage } from "../homepage-pages";

export const metadata: Metadata = {
  title: "올바름 소개 | 주식회사 올바름",
  alternates: { canonical: "/about" },
};

export default function About() {
  return <AboutPage />;
}
