import { createEmployee } from "@/lib/phase1-data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ employee: await createEmployee(body) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "직원을 등록하지 못했습니다." },
      { status: 400 },
    );
  }
}
