import DetailForm from "./detail-form";

type PageProps = { params: Promise<{ id: string }> };

export default function DetailPage({ params }: PageProps) {
  return <DetailForm params={params} />;
}
