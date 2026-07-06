import { redirect } from "next/navigation";
import { getManagerUser, sanitizeManagerNextPath } from "@/lib/manager-auth";
import ManagerKakaoLogin from "./manager-kakao-login";

export default async function ManagerAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getManagerUser();

  if (user) {
    redirect(sanitizeManagerNextPath(next));
  }

  return <ManagerKakaoLogin />;
}
