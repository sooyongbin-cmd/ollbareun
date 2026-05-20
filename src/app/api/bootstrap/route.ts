import { loadBootstrap } from "@/lib/phase1-data";

export async function GET() {
  try {
    return Response.json(await loadBootstrap());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "데이터를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
