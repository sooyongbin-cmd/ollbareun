import { NextResponse } from "next/server";
import { getManagerUserWithRole } from "@/lib/manager-auth";
import { updateAdminUserRole, deleteAdminUser } from "@/lib/admin-users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const authInfo = await getManagerUserWithRole();
    if (!authInfo) {
      return NextResponse.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    if (authInfo.adminUser.role !== "super_admin") {
      return NextResponse.json({ error: "최고 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const role = body.role;

    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json({ error: "올바르지 않은 직군입니다." }, { status: 400 });
    }

    const updated = await updateAdminUserRole(id, role);
    return NextResponse.json({ admin: updated });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "관리자 권한 변경에 실패했습니다." },
      { status },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const authInfo = await getManagerUserWithRole();
    if (!authInfo) {
      return NextResponse.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    if (authInfo.adminUser.role !== "super_admin") {
      return NextResponse.json({ error: "최고 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { id } = await params;
    await deleteAdminUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "관리자 삭제에 실패했습니다." },
      { status },
    );
  }
}
