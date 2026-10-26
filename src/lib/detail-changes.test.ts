import { expect, it } from "vitest";
import { applyDetailChanges, collectDetailChanges, type DetailChange } from "./detail-changes";

it("merges only the saved fields and preserves unrelated rows and joined data", () => {
  const first = { id: "one", name: "직원1", worksite: "본사", phone: "01011112222" };
  const other = { id: "two", name: "직원2", worksite: "지점", phone: "01033334444" };
  const result = applyDetailChanges([first, other], [{ entity: "employee", id: "one", action: "upsert", data: { phone: "01099998888", worksite: undefined } }], "employee");
  expect(result[0]).toEqual({ ...first, phone: "01099998888" });
  expect(result[1]).toBe(other);
  expect(first.phone).toBe("01011112222");
});

it("coalesces repeated and nested saves while retaining other entities", () => {
  const changes: DetailChange[] = [{ entity: "employee", id: "one", action: "upsert", data: { name: "이전", role: "경비원" } }];
  const merged = collectDetailChanges(changes, [
    { entity: "assignment", id: "a", action: "delete" },
    { entity: "employee", id: "one", action: "upsert", data: { name: "최종" } },
  ]);
  expect(merged).toHaveLength(2);
  expect(merged[0].data).toEqual({ name: "최종", role: "경비원" });
  expect(applyDetailChanges([{ id: "a" }, { id: "b" }], merged, "assignment")).toEqual([{ id: "b" }]);
});
