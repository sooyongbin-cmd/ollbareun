import { createSpecialRemarkReport } from "@/lib/special-remark-reports";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({
      report: await createSpecialRemarkReport(body, { emailProvider: "naver" }),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "특이사항 보고를 저장하지 못했습니다." },
      { status: 400 },
    );
  }
}
