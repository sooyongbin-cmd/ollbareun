import { describe, expect, it, vi } from "vitest";
import { createEducationResource, updateEducationResource } from "./education-resources";
import { educationTypes, educationTypeLabels } from "./education-periods";

describe("education resource category persistence", () => {
  it.each(educationTypes)("stores and returns %s for both create and edit", async (type) => {
    const row = { id: "r", title: "교육", youtube_link: "https://youtu.be/example", education_type: type, startdate: "2026-10-07", enddate: "2026-10-31" };
    const q = {
      insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    };
    const db = { from: vi.fn(() => q) };
    const input = { id: "r", title: "교육", youtubeLink: "https://youtu.be/example", educationType: type, startdate: "2026-10-07", enddate: "2026-10-31" };
    expect(await createEducationResource(input, db as never)).toEqual(row);
    expect(await updateEducationResource(input, db as never)).toEqual(row);
    await createEducationResource(input, db as never);
    expect(q.insert).toHaveBeenCalledTimes(2);
    expect(q.maybeSingle).not.toHaveBeenCalled();
    expect(q.insert).toHaveBeenCalledWith(expect.objectContaining({ education_type: educationTypeLabels[type], startdate: input.startdate, enddate: input.enddate }));
    expect(q.update).toHaveBeenCalledWith(expect.objectContaining({ education_type: educationTypeLabels[type], startdate: input.startdate, enddate: input.enddate }));
  });
  it("rejects invalid category before writing", async () => {
    const db = { from: vi.fn() };
    await expect(createEducationResource({ title: "교육", youtubeLink: "https://youtu.be/example", educationType: "annual" }, db as never)).rejects.toThrow("안전교육구분");
    expect(db.from).not.toHaveBeenCalled();
  });
  it.each([
    [undefined, "2026-10-07"], ["2026-10-07", undefined],
    ["2026-02-30", "2026-10-07"], ["2026-10-08", "2026-10-07"],
  ])("rejects missing or invalid date range %s to %s before writing", async (startdate, enddate) => {
    const db = { from: vi.fn() };
    const input = { id: "r", title: "교육", youtubeLink: "https://youtu.be/example", educationType: "daily", startdate, enddate };
    await expect(createEducationResource(input, db as never)).rejects.toThrow();
    await expect(updateEducationResource(input, db as never)).rejects.toThrow();
    expect(db.from).not.toHaveBeenCalled();
  });
});
