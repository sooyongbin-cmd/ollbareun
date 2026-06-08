import {
  approveGuardPasskeyRequest,
  rejectGuardPasskeyRequest,
  revokeGuardPasskey,
} from "@/lib/guard-passkeys";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const action = body.action;

    if (action === "approve") {
      return Response.json({ request: await approveGuardPasskeyRequest(id, body.reviewedBy) });
    }
    if (action === "reject") {
      return Response.json({ request: await rejectGuardPasskeyRequest(id, body.reviewedBy) });
    }
    if (action === "revoke") {
      return Response.json({ request: await revokeGuardPasskey(id, body.reviewedBy) });
    }

    return Response.json({ error: "지원하지 않는 패스키 요청 작업입니다." }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "패스키 요청 작업을 처리하지 못했습니다." },
      { status: 400 },
    );
  }
}
