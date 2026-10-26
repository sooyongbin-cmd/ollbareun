import { expect, it } from "vitest";
import { addRegisteredRow } from "./registration-result";

it("adds a persisted record without replacing unrelated rows, and deduplicates repeated callbacks", () => {
  const existing = { id: "old", name: "기존", metadata: "유지" };
  const first = addRegisteredRow([existing], { id: "new", name: "신규", metadata: "새 값" });
  expect(first.map((row) => row.id)).toEqual(["new", "old"]);
  expect(first[1]).toBe(existing);
  const second = addRegisteredRow(first, { id: "new", name: "서버 확정 이름", metadata: undefined });
  expect(second).toHaveLength(2);
  expect(second[0]).toEqual({ id: "new", name: "서버 확정 이름", metadata: "새 값" });
  expect(second[1]).toBe(existing);
});

it("supports system-code identity and refuses a missing server ID", () => {
  expect(addRegisteredRow([{ system_code: "a", content: "기존" }], { system_code: "b", content: "추가" }, "system_code")).toHaveLength(2);
  expect(() => addRegisteredRow([], { name: "ID 없음" })).toThrow("식별자");
});
