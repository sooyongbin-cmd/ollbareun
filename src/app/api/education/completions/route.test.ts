import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentEducationStatus, listEducationCompletions, markEducationCompletion } from "@/lib/education-completions";
import { requireGuardEmployee } from "@/lib/guard-auth-session";
import { getManagerUser } from "@/lib/manager-auth";
import { GET, POST } from "./route";

vi.mock("@/lib/education-completions", () => ({
  listEducationCompletions: vi.fn(),
  currentEducationStatus: vi.fn(),
  markEducationCompletion: vi.fn(),
}));
vi.mock("@/lib/guard-auth-session", () => ({
  requireGuardEmployee: vi.fn(),
  guardAuthErrorStatus: (error: Error & { status?: number }, fallback: number) => error.status ?? fallback,
}));
vi.mock("@/lib/manager-auth", () => ({ getManagerUser: vi.fn().mockResolvedValue({ id: "manager-1" }) }));

describe("education completions route", () => {
  beforeEach(() => {
    vi.mocked(getManagerUser).mockResolvedValue({ id: "manager-1" } as never);
    vi.mocked(currentEducationStatus).mockReset();
    vi.mocked(listEducationCompletions).mockReset();
    vi.mocked(markEducationCompletion).mockReset();
    vi.mocked(requireGuardEmployee).mockReset();
    vi.mocked(requireGuardEmployee).mockResolvedValue({ id: "employee-1", name: "홍길동", role: "경비원", is_retired: false });
  });

  it("lists education completions", async () => {
    vi.mocked(listEducationCompletions).mockResolvedValue([
      {
        id: "completion-1", education_date: "2026-05-27", education_type: "daily",
          employee_id: "employee-1",
        employee_name: "홍길동",
        resource_id: "resource-1",
        resource_title: "화재 안전 교육",
        resource_youtube_link: "https://www.youtube.com/watch?v=fireSafety",
        is_completed: true,
        completed_at: "2026-05-27T09:10:00.000Z",
      },
    ]);

    const response = await GET(new Request("http://localhost/api/education/completions"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      completions: [
        {
          id: "completion-1", education_date: "2026-05-27", education_type: "daily",
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

  it("scopes guard reads to the authenticated employee regardless of query parameters", async () => {
    vi.mocked(getManagerUser).mockResolvedValue(null);
    vi.mocked(currentEducationStatus).mockResolvedValue([]);
    const response = await GET(new Request("http://localhost/api/education/completions?employeeId=another-employee&view=history"));
    expect(response.status).toBe(200);
    expect(currentEducationStatus).toHaveBeenCalledWith("employee-1");
    expect(listEducationCompletions).not.toHaveBeenCalled();
  });

  it("records an education completion", async () => {
    vi.mocked(markEducationCompletion).mockResolvedValue({
      id: "completion-1", education_date: "2026-05-27", education_type: "daily",
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
        id: "completion-1", education_date: "2026-05-27", education_type: "daily",
          employee_id: "employee-1",
        resource_id: "resource-1",
        is_completed: true,
        completed_at: "2026-05-27T09:10:00.000Z",
      },
    });
  });

  it("rejects completion writes after employee access is revoked", async () => {
    const error = new Error("퇴직 처리된 직원은 이용할 수 없습니다.");
    error.name = "InactiveEmployeeError";
    Object.assign(error, { status: 403 });
    vi.mocked(requireGuardEmployee).mockRejectedValue(error);

    const response = await POST(
      new Request("http://localhost/api/education/completions", {
        method: "POST",
        body: JSON.stringify({
          employeeId: "employee-1",
          resourceId: "resource-1",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(markEducationCompletion).not.toHaveBeenCalled();
  });
});
