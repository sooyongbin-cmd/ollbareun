import { deleteSystemConfig, getSystemConfig, updateSystemConfig } from "@/lib/system-configs";
import { getManagerUser } from "@/lib/manager-auth";

type RouteContext = {
  params: Promise<{ systemCode: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const { systemCode } = await params;
    return Response.json({ config: await getSystemConfig(decodeURIComponent(systemCode)) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "시스템설정을 불러오지 못했습니다." },
      { status: 404 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const { systemCode } = await params;
    const body = await request.json();
    return Response.json({
      config: await updateSystemConfig({
        systemCode: decodeURIComponent(systemCode),
        parentSystemCode: body.parentSystemCode,
        description: body.description,
        content: body.content,
      }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "시스템설정을 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const { systemCode } = await params;
    await deleteSystemConfig(decodeURIComponent(systemCode));
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "시스템설정을 삭제하지 못했습니다." },
      { status: 400 },
    );
  }
}
