import type { Metadata } from "next";
import { ClientsPage } from "../homepage-pages";

export const metadata: Metadata = {
  title: "고객사 | 주식회사 올바름",
  alternates: { canonical: "/clients" },
};

export default function Clients() {
  return <ClientsPage />;
}
