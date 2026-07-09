import { NextResponse } from "next/server";
import { getManagerUserWithRole } from "@/lib/manager-auth";
import { listAdminUsers, registerAdminUser } from "@/lib/admin-users";

export async function GET() {
  try {
    const authInfo = await getManagerUserWithRole();
    if (!authInfo) {
      return NextResponse.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const admins = await listAdminUsers();
    return NextResponse.json({ admins });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "관리자 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const authInfo = await getManagerUserWithRole();
    if (!authInfo) {
      return NextResponse.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    if (authInfo.adminUser.role !== "super_admin") {
      return NextResponse.json({ error: "최고 관리자 권한이 필요합니다." }, { status: 403 });
    }

    const body = await request.json();
    const email = body.email;
    const role = body.role || "admin";

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
    }
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json({ error: "올바르지 않은 역할입니다." }, { status: 400 });
    }

    const admin = await registerAdminUser(email, role, authInfo.user.id);
    return NextResponse.json({ admin });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "관리자 등록을 완료하지 못했습니다." },
      { status },
    );
  }
}
