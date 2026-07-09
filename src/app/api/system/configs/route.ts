import { createSystemConfig, listSystemConfigs } from "@/lib/system-configs";
import { getManagerUser } from "@/lib/manager-auth";

export async function GET() {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    return Response.json({ configs: await listSystemConfigs() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "시스템설정을 불러오지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const manager = await getManagerUser();
    if (!manager) {
      return Response.json({ error: "인증 정보가 올바르지 않습니다." }, { status: 401 });
    }

    const body = await request.json();
    return Response.json({
      config: await createSystemConfig({
        systemCode: body.systemCode,
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
