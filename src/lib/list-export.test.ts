import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildListWorkbook, downloadListWorkbook, readListFilters, readListTable } from "./list-export";

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-22T16:00:00Z")); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ""; });
const table = { headers: ["이름", "근태"], rows: [["홍길동", "출근 퇴근"]] };

describe("common list Excel export", () => {
  it("writes title, each filter, headers and escaped text rows in that order", () => {
    const html = buildListWorkbook("근태관리", [{ label: "직원이름", value: "전체직원" }, { label: "출퇴근예정일", value: "2026-10-23" }], table);
    const root = document.createElement("div"); root.innerHTML = html;
    expect(Array.from(root.querySelectorAll("tr")).map((row) => row.textContent)).toEqual([
      "근태관리", "직원이름 : 전체직원", "출퇴근예정일 : 2026-10-23", "이름근태", "홍길동출근 퇴근",
    ]);
    const escaped = buildListWorkbook("<script>", [], { headers: ["코드"], rows: [["00123"], ["=HYPERLINK(\"bad\")"]] });
    expect(escaped).toContain("&lt;script&gt;");
    expect(escaped).toContain("mso-number-format");
    expect(escaped).toContain("00123");
  });
  it("reads only the enclosing list's columns and exports visible values, selected options and O/X", () => {
    const root = document.createElement("div");
    root.innerHTML = '<table><thead><tr><th>이름</th><th>교육</th><th>선택</th><th data-export-ignore>삭제</th></tr></thead><tbody><tr><td><a>홍길동 (경비,격일)</a></td><td><button aria-label="미이수 처리">X</button></td><td><select><option>Y</option><option selected>N</option></select></td><td><button>삭제</button></td></tr><tr><td colspan="4">빈 목록</td></tr></tbody></table>';
    expect(readListTable(root)).toEqual({ headers: ["이름", "교육", "선택"], rows: [["홍길동 (경비,격일)", "X", "N"]] });
  });
  it("reads labels and selected option names and omits list controls and dialogs", () => {
    const page = document.createElement("main");
    page.innerHTML = '<label for="name">직원이름</label><input id="name" placeholder="전체직원"><label for="site">근무지</label><select id="site"><option value="uuid">본사</option></select><section id="list"><label>목록 수정<input value="수정"></label></section><div role="dialog"><label>비밀번호<input value="secret"></label></div>';
    expect(readListFilters(page, page.querySelector("#list")!)).toEqual([{ label: "직원이름", value: "전체직원" }, { label: "근무지", value: "본사" }]);
  });
  it("uses Korean dates and increments names across repeated fallback downloads", async () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() });
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    await downloadListWorkbook({ title: "근태관리", filters: [], getTable: () => table });
    await downloadListWorkbook({ title: "근태관리", filters: [], getTable: () => table });
    expect(names).toEqual(["근태관리_20261023_0001.xls", "근태관리_20261023_0002.xls"]);
  });
  it("checks actual files in the selected directory and never overwrites existing names", async () => {
    const write = vi.fn(); const close = vi.fn();
    const getFileHandle = vi.fn(async (name: string, options?: { create: boolean }) => {
      if (!options?.create && !name.endsWith("0001.xls")) throw new DOMException("missing", "NotFoundError");
      return { createWritable: async () => ({ write, close }) };
    });
    Object.defineProperty(window, "showDirectoryPicker", { configurable: true, value: vi.fn(async () => ({ getFileHandle })) });
    try {
      await downloadListWorkbook({ title: "직원관리", filters: [], getTable: () => table });
      expect(getFileHandle).toHaveBeenCalledWith("직원관리_20261023_0002.xls", { create: true });
      expect(write).toHaveBeenCalledWith(expect.any(Blob)); expect(close).toHaveBeenCalledOnce();
    } finally { Reflect.deleteProperty(window, "showDirectoryPicker"); }
  });
  it("does not download partial data when gathering all pages fails", async () => {
    const create = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: create });
    await expect(downloadListWorkbook({ title: "교육이수상세", filters: [], getTable: async () => { throw new Error("조회 실패"); } })).rejects.toThrow("조회 실패");
    expect(create).not.toHaveBeenCalled();
  });
});
