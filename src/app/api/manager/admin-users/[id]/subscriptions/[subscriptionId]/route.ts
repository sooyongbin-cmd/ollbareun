import { getManagerUserWithRole } from "@/lib/manager-auth";
import { deleteAdminPushSubscription } from "@/lib/admin-push-subscriptions";

export async function DELETE(_request: Request, { params }: {
  params: Promise<{ id: string; subscriptionId: string }>;
}) {
  const auth = await getManagerUserWithRole();
  if (!auth) return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
  if (auth.adminUser.role !== "super_admin") {
    return Response.json({ error: "최고 관리자 권한이 필요합니다." }, { status: 403 });
  }
  try {
    const { id, subscriptionId } = await params;
    await deleteAdminPushSubscription(id, subscriptionId);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "구독 삭제에 실패했습니다." }, { status: 400 });
  }
}
