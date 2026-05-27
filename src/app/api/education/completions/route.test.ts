import { beforeEach, describe, expect, it, vi } from "vitest";
import { listEducationCompletions, markEducationCompletion } from "@/lib/education-completions";
import { GET, POST } from "./route";

vi.mock("@/lib/education-completions", () => ({
  listEducationCompletions: vi.fn(),
  markEducationCompletion: vi.fn(),
}));

describe("education completions route", () => {
  beforeEach(() => {
    vi.mocked(listEducationCompletions).mockReset();
    vi.mocked(markEducationCompletion).mockReset();
  });

  it("lists education completions", async () => {
    vi.mocked(listEducationCompletions).mockResolvedValue([
      {
        employee_id: "employee-1",
        employee_name: "홍길동",
        resource_id: "resource-1",
        resource_title: "화재 안전 교육",
        resource_youtube_link: "https://www.youtube.com/watch?v=fireSafety",
        is_completed: true,
        completed_at: "2026-05-27T09:10:00.000Z",
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      completions: [
        {
          employee_id: "employee-1",
          employee_name: "홍길동",
          resource_id: "resource-1",
          resource_title: "화재 안전 교육",
          resource_youtube_link: "https://www.youtube.com/watch?v=fireSafety",
          is_completed: true,
          completed_at: "2026-05-27T09:10:00.000Z",
        },
      ],
    });
  });

  it("records an education completion", async () => {
    vi.mocked(markEducationCompletion).mockResolvedValue({
      employee_id: "employee-1",
      resource_id: "resource-1",
      is_completed: true,
      completed_at: "2026-05-27T09:10:00.000Z",
    });

    const response = await POST(
      new Request("http://localhost/api/education/completions", {
        method: "POST",
        body: JSON.stringify({
          employeeId: "employee-1",
          resourceId: "resource-1",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(markEducationCompletion).toHaveBeenCalledWith({
      employeeId: "employee-1",
      resourceId: "resource-1",
    });
    await expect(response.json()).resolves.toEqual({
      completion: {
        employee_id: "employee-1",
        resource_id: "resource-1",
        is_completed: true,
        completed_at: "2026-05-27T09:10:00.000Z",
      },
    });
  });
});
