type KakaoRoadAddress = {
  address_name: string;
};

type KakaoLandAddress = {
  address_name: string;
};

type KakaoAddressDocument = {
  road_address?: KakaoRoadAddress | null;
  address?: KakaoLandAddress | null;
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
  const lat = requestUrl.searchParams.get("lat")?.trim();
  const lng = requestUrl.searchParams.get("lng")?.trim();

  if (!lat || !lng) {
    return Response.json({ error: "위도와 경도를 입력하세요." }, { status: 400 });
  }

  const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/geo/coord2address.json");
  kakaoUrl.searchParams.set("x", lng);
  kakaoUrl.searchParams.set("y", lat);

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
      { error: payload.message ?? "좌표의 주소 정보를 확인하지 못했습니다." },
      { status: response.status },
    );
  }

  const document = payload.documents?.[0];
  if (!document) {
    return Response.json({ error: "해당 좌표의 주소 정보를 찾지 못했습니다." }, { status: 404 });
  }

  const addressName = document.road_address?.address_name ?? document.address?.address_name ?? "";

  return Response.json({
    address: addressName,
  });
}
