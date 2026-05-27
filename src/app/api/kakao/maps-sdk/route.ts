export function GET() {
  const appKey = process.env.kakao_map_key;

  if (!appKey) {
    return Response.json({ error: "Kakao map key is not configured." }, { status: 500 });
  }

  const url = new URL("https://dapi.kakao.com/v2/maps/sdk.js");
  url.searchParams.set("appkey", appKey);
  url.searchParams.set("libraries", "services");
  url.searchParams.set("autoload", "false");

  return new Response(
    `
(function () {
  var script = document.createElement("script");
  script.async = false;
  script.src = ${JSON.stringify(url.toString())};
  script.onload = function () {
    if (window.__ollbareunKakaoMapSdkLoaded) {
      window.__ollbareunKakaoMapSdkLoaded();
    }
  };
  script.onerror = function () {
    if (window.__ollbareunKakaoMapSdkError) {
      window.__ollbareunKakaoMapSdkError();
    }
  };
  document.head.appendChild(script);
})();
`,
    {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
      },
    },
  );
}
