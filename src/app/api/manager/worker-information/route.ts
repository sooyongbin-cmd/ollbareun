import { getManagerUser } from "@/lib/manager-auth";
import { loadWorkerInformation } from "@/lib/worker-information";

export async function GET(request: Request) {
  if (!(await getManagerUser()))
    return Response.json(
      { error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  try {
    const params = new URL(request.url).searchParams;
    return Response.json({
      rows: await loadWorkerInformation(
        params.get("start") ?? "",
        params.get("end") ?? "",
      ),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "근무자정보를 불러오지 못했습니다.",
      },
      { status: 400 },
    );
  }
}
