import {
  DEFAULT_COMPANY_MAP_COORDINATES,
  normalizeCompanyAddress,
  parseCompanyMapCoordinates,
} from "@/lib/company-address";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const address = normalizeCompanyAddress(params.get("address"));
  const { latitude, longitude } =
    parseCompanyMapCoordinates(params.get("coordinates")) ?? DEFAULT_COMPANY_MAP_COORDINATES;
  const isHeadOfficeArea = latitude === DEFAULT_COMPANY_MAP_COORDINATES.latitude
    && longitude === DEFAULT_COMPANY_MAP_COORDINATES.longitude;
  const addressText = address.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const mapUrl = `https://map.kakao.com/link/map/올바름,${latitude},${longitude}`;

  // Serve a plain document so the map can start even if the parent page never hydrates.
  return new Response(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>올바름 본사 위치 지도</title>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; }
    body { font: 16px/1.5 -apple-system, BlinkMacSystemFont, sans-serif; color: #222; }
    #map { position: relative; z-index: 0; }
    #fallback { z-index: 1; position: absolute; top: 0; bottom: 0; left: 0; right: 0;
      display: flex; align-items: center; justify-content: center; text-align: center;
      background: #eef1f3 center / cover no-repeat; }
    #fallback.area { background-image: url("/homepage/location-map.jpg"); }
    #fallback[hidden] { display: none; }
    address { padding: 16px 20px; margin: 12px; background: white; font-style: normal; }
    address a { display: block; color: #13558c; }
    @media (max-width: 767px) {
      #map img[src*="map-pin.svg"] { transform: scale(.5); transform-origin: 50% 100%; }
    }
  </style>
  <script defer src="/homepage/contact-map.js"></script>
  <script defer src="/api/kakao/maps-sdk"></script>
</head>
<body>
  <div id="map" data-latitude="${latitude}" data-longitude="${longitude}" aria-label="올바름 본사 위치 지도"></div>
  <div id="fallback"${isHeadOfficeArea ? ' class="area"' : ""}>
    <address>
      <strong>올바름 본사</strong><br>${addressText}
      <a href="${mapUrl}" target="_blank" rel="noopener noreferrer">카카오맵에서 보기</a>
      <a href="tel:0514657767">전화 051-465-7767</a>
      <a href="mailto:olbareum@naver.com">olbareum@naver.com</a>
    </address>
  </div>
</body>
</html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
