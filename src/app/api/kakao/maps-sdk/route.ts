export function GET() {
  const appKey = process.env.kakao_map_key;

  if (!appKey) {
    return Response.json({ error: "Kakao map key is not configured." }, { status: 500 });
  }

  const url = new URL("https://dapi.kakao.com/v2/maps/sdk.js");
  url.searchParams.set("appkey", appKey);
  url.searchParams.set("libraries", "services");
  url.searchParams.set("autoload", "false");

  return Response.redirect(url.toString(), 307);
}
