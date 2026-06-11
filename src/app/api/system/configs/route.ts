import { createSystemConfig, listSystemConfigs } from "@/lib/system-configs";

export async function GET() {
  try {
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
    const body = await request.json();
    return Response.json({
      config: await createSystemConfig({
        systemCode: body.systemCode,
        parentSystemCode: body.parentSystemCode,
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
