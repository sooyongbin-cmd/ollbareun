function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function readParam(params: URLSearchParams, key: string) {
  return params.get(key) ?? "";
}

async function getParams(request: Request) {
  if (request.method === "POST") {
    const formData = await request.formData();
    const params = new URLSearchParams();

    formData.forEach((value, key) => {
      params.set(key, String(value));
    });

    return params;
  }

  return new URL(request.url).searchParams;
}

function renderCallback(params: URLSearchParams) {
  const payload = [
    readParam(params, "roadFullAddr"),
    readParam(params, "roadAddrPart1"),
    readParam(params, "addrDetail"),
    readParam(params, "roadAddrPart2"),
    readParam(params, "engAddr"),
    readParam(params, "jibunAddr"),
    readParam(params, "zipNo"),
    readParam(params, "admCd"),
    readParam(params, "rnMgtSn"),
    readParam(params, "bdMgtSn"),
    readParam(params, "detBdNmList"),
    readParam(params, "bdNm"),
    readParam(params, "bdKdcd"),
    readParam(params, "siNm"),
    readParam(params, "sggNm"),
    readParam(params, "emdNm"),
    readParam(params, "liNm"),
    readParam(params, "rn"),
    readParam(params, "udrtYn"),
    readParam(params, "buldMnnm"),
    readParam(params, "buldSlno"),
    readParam(params, "mtYn"),
    readParam(params, "lnbrMnnm"),
    readParam(params, "lnbrSlno"),
    readParam(params, "emdNo"),
  ];

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>주소 선택 완료</title>
  </head>
  <body>
    <script>
      if (window.opener && !window.opener.closed && window.opener.jusoCallBack) {
        window.opener.jusoCallBack(...${JSON.stringify(payload)});
      }
      window.close();
    </script>
  </body>
</html>`;
}

async function handlePopup(request: Request) {
  const key = process.env.juso_key;

  if (!key) {
    return new Response("Juso environment variable is missing.", { status: 500 });
  }

  const params = await getParams(request);
  if (readParam(params, "inputYn") === "Y") {
    return new Response(renderCallback(params), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const url = new URL(request.url);
  const returnUrl = new URL("/api/juso/popup", url.origin).toString();

  return new Response(
    `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>주소 검색</title>
  </head>
  <body onload="document.forms[0].submit()">
    <form method="post" action="https://business.juso.go.kr/addrlink/addrMapUrl.do">
      <input type="hidden" name="confmKey" value="${escapeHtml(key)}" />
      <input type="hidden" name="returnUrl" value="${escapeHtml(returnUrl)}" />
      <input type="hidden" name="resultType" value="4" />
    </form>
  </body>
</html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export async function GET(request: Request) {
  return handlePopup(request);
}

export async function POST(request: Request) {
  return handlePopup(request);
}
