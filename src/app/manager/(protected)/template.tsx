import { requireManagerUser } from "@/lib/manager-auth";

export default async function ManagerProtectedTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireManagerUser();

  return children;
}
