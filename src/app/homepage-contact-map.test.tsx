import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_COMPANY_ADDRESS, DEFAULT_COMPANY_MAP_COORDINATES } from "@/lib/company-address";
import { GET } from "./(public)/about/map/route";
import HomepageContactMap from "./homepage-contact-map";

const startup = readFileSync(join(process.cwd(), "public/homepage/contact-map.js"), "utf8");

async function getMapDocument(props: ComponentProps<typeof HomepageContactMap> = {}) {
  const page = new DOMParser().parseFromString(renderToStaticMarkup(<HomepageContactMap {...props} />), "text/html");
  const frame = page.querySelector("iframe")!;
  expect(frame.title).toContain("올바름 본사 위치 지도");
  const location = new URL(frame.getAttribute("src")!, "https://www.olbareum.com");
  expect(location.pathname).toBe("/about/map");
  const response = GET(new Request(location));
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  return new DOMParser().parseFromString(await response.text(), "text/html");
}

function startMap(document: Document, maps: object) {
  const scope: { kakao: { maps: object }; __ollbareunKakaoMapSdkLoaded?: () => void } = { kakao: { maps } };
  runInNewContext(startup, { window: scope, document });
  scope.__ollbareunKakaoMapSdkLoaded!();
}

describe("homepage contact map", () => {
  it("serves the office overview and contact links before any scripts run", async () => {
    const doc = await getMapDocument();
    const fallback = doc.getElementById("fallback")!;
    expect(fallback.hidden).toBe(false);
    expect(fallback.classList.contains("area")).toBe(true);
    expect(fallback.textContent).toContain(DEFAULT_COMPANY_ADDRESS);
    expect(fallback.querySelector("a")!.getAttribute("href")).toContain("35.1673384631299,128.955819688911");
    expect(fallback.querySelector('a[href="tel:0514657767"]')).not.toBeNull();
    expect(fallback.querySelector('a[href="mailto:olbareum@naver.com"]')).not.toBeNull();
    expect(Array.from(doc.scripts, script => script.getAttribute("src"))).toEqual([
      "/homepage/contact-map.js", "/api/kakao/maps-sdk",
    ]);
    const canvas = doc.getElementById("map")!;
    expect(Number(canvas.dataset.latitude)).toBe(DEFAULT_COMPANY_MAP_COORDINATES.latitude);
    expect(Number(canvas.dataset.longitude)).toBe(DEFAULT_COMPANY_MAP_COORDINATES.longitude);
  });

  it("uses updated coordinates for both the Kakao map and its standalone link", async () => {
    const coordinates = { latitude: 35.123456, longitude: 128.901234 };
    const address = "본사 <별관> & 사무실";
    const doc = await getMapDocument({ coordinates, address });
    const fallback = doc.getElementById("fallback")!;
    expect(fallback.textContent).toContain(address);
    expect(fallback.classList.contains("area")).toBe(false);
    expect(fallback.querySelector("a")!.getAttribute("href")).toContain("35.123456,128.901234");

    const map = {};
    const position = {};
    const maps = {
      load: (ready: () => void) => ready(),
      LatLng: vi.fn(function () { return position; }),
      Map: vi.fn(function () { return map; }),
      Marker: vi.fn(function () {}),
    };
    startMap(doc, maps);
    expect(maps.LatLng).toHaveBeenCalledWith(coordinates.latitude, coordinates.longitude);
    expect(maps.Map).toHaveBeenCalledWith(doc.getElementById("map"), { center: position, level: 3 });
    expect(maps.Marker).toHaveBeenCalledWith({ map, position });
    expect(fallback.hidden).toBe(true);
  });

  it("keeps the overview and an actionable link if Kakao never becomes ready", async () => {
    const doc = await getMapDocument();
    startMap(doc, { load: vi.fn() });
    expect(doc.getElementById("fallback")!.hidden).toBe(false);
    expect(doc.querySelector("address a")!.textContent).toBe("카카오맵에서 보기");
  });
});
