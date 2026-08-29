import type { Metadata } from "next";
import { ServicesPage } from "../../homepage-pages";

export const metadata: Metadata = {
  title: "서비스 | 주식회사 올바름",
  alternates: { canonical: "/services" },
};

export default function Services() {
  return <ServicesPage />;
}
