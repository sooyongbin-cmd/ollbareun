type KakaoAddressDocument = {
  x: string;
  y: string;
};

type KakaoAddressResponse = {
  documents?: KakaoAddressDocument[];
  message?: string;
  errorType?: string;
};

function getOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    return origin;
  }

  const url = new URL(request.url);
  return url.origin;
}

export async function GET(request: Request) {
  const appKey = process.env.kakao_map_key;

  if (!appKey) {
    return Response.json({ error: "Kakao map key is not configured." }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const query = requestUrl.searchParams.get("query")?.trim();

  if (!query) {
    return Response.json({ error: "주소를 입력하세요." }, { status: 400 });
  }

  const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  kakaoUrl.searchParams.set("query", query);

  const origin = getOrigin(request);
  const response = await fetch(kakaoUrl.toString(), {
    headers: {
      Authorization: `KakaoAK ${appKey}`,
      KA: `sdk/1.0 os/javascript lang/ko-KR device/browser origin/${encodeURIComponent(origin)}`,
    },
  });
  const payload = (await response.json()) as KakaoAddressResponse;

  if (!response.ok) {
    return Response.json(
      { error: payload.message ?? "주소의 GPS정보를 확인하지 못했습니다." },
      { status: response.status },
    );
  }

  const document = payload.documents?.[0];
  if (!document) {
    return Response.json({ error: "입력한 주소의 GPS정보를 찾지 못했습니다." }, { status: 404 });
  }

  return Response.json({
    gpsInfo: {
      latitude: Number(document.y),
      longitude: Number(document.x),
    },
  });
}
