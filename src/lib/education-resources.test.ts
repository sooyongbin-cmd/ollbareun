import { describe, expect, it, vi } from "vitest";
import { createEducationResource, updateEducationResource } from "./education-resources";
import { educationTypes } from "./education-periods";

describe("education resource category persistence", () => {
  it.each(educationTypes)("stores and returns %s for both create and edit", async (type) => {
    const row = { id: "r", title: "교육", youtube_link: "https://youtu.be/example", education_type: type };
    const q = { insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: row, error: null }) };
    const db = { from: vi.fn(() => q) };
    const input = { id: "r", title: "교육", youtubeLink: "https://youtu.be/example", educationType: type };
    expect(await createEducationResource(input, db as never)).toEqual(row);
    expect(await updateEducationResource(input, db as never)).toEqual(row);
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ education_type: type }));
    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ education_type: type }));
  });
  it("rejects invalid category before writing", async () => {
    const db = { from: vi.fn() };
    await expect(createEducationResource({ title: "교육", youtubeLink: "https://youtu.be/example", educationType: "annual" }, db as never)).rejects.toThrow("안전교육구분");
    expect(db.from).not.toHaveBeenCalled();
  });
});
