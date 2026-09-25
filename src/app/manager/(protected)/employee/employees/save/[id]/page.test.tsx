import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeSavePage from "./page";

const push = vi.fn();
const useParams = vi.fn();
const assignment = {
  id: "assignment-1",
  worksite_name: "본사",
  start_date: "2026-05-21",
  end_date: "2026-05-23",
};
let employeeAssignments = [assignment];
let employeeDetails = {
  educationCompletions: [
    {
      resource_id: "resource-1",
      resource_title: "화재 안전 교육",
      is_completed: true,
      completed_at: "2026-05-27T09:10:00.000Z",
    },
    {
      resource_id: "resource-2",
      resource_title: "순찰 안전 교육",
      is_completed: false,
      completed_at: null,
    },
  ],
  attendance: [
    {
      id: "record-1",
      work_date: "2026-05-27",
      worksite_name: "본사",
      intime: "2026-05-27T00:00:00.000Z",
      outtime: "2026-05-27T09:00:00.000Z",
      intime_status: "2",
      work_intime: "2026-05-27T00:10:00.000Z",
      work_outtime: "2026-05-27T09:10:00.000Z",
    },
  ],
  leaves: [
    {
      id: "leave-1",
      leave_type: "2",
      start_date: "2026-06-01",
      end_date: "2026-06-02",
    },
  ],
  inspectionLogs: [
    {
      id: "inspection-1",
      inspected_at: "2026-05-27T10:10:00.000Z",
      site_name: "정문",
      worksite_name: "본사",
    },
  ],
  specialRemarks: [
    {
      id: "remark-1",
      reported_at: "2026-05-27T11:10:00.000Z",
      content: "엘리베이터 이상\n상세 내용",
    },
  ],
};
const defaultEmployeeDetails = employeeDetails;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useParams: () => useParams(),
}));

describe("employee save page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    useParams.mockReturnValue({ id: "emp-1" });
    employeeAssignments = [assignment];
    employeeDetails = {
      educationCompletions: [...defaultEmployeeDetails.educationCompletions],
      attendance: [...defaultEmployeeDetails.attendance],
      leaves: [...defaultEmployeeDetails.leaves],
      inspectionLogs: [...defaultEmployeeDetails.inspectionLogs],
      specialRemarks: [...defaultEmployeeDetails.specialRemarks],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (!init && url.endsWith("/api/employees/emp-1")) {
          return Response.json({
            employee: {
              id: "emp-1",
              name: "Alice",
              phone: "010-1234-5678",
              role: "경비원",
              work_style: "1",
              in_time: "06:00",
              out_time: "06:00",
              is_retired: false,
            },
            assignments: employeeAssignments,
            totalEducationCount: 3,
            ...employeeDetails,
          });
        }

        if (init?.method === "PATCH" && url.endsWith("/api/employees/emp-1")) {
          const body = JSON.parse(String(init.body));
          expect(body).toEqual({
            name: "Alice Kim",
            phone: "010-9999-8888",
            role: "경비원",
            work_style: "1",
            in_time: "06:00",
            out_time: "06:00",
            is_retired: true,
          });
          return Response.json({
            employee: {
              id: "emp-1",
              name: "Alice Kim",
              phone: "010-9999-8888",
              role: "경비원",
              work_style: "1",
              in_time: "06:00",
              out_time: "06:00",
              is_retired: true,
            },
          });
        }

        if (init?.method === "DELETE" && url.endsWith("/api/employees/emp-1")) {
          return new Response(null, { status: 204 });
        }

        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("loads an employee and saves the edited data", async () => {
    const user = userEvent.setup();

    render(<EmployeeSavePage />);

    expect(await screen.findByRole("heading", { name: "직원 상세" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByDisplayValue("010-1234-5678")).toBeInTheDocument();
    expect(screen.getByLabelText("직원이름").closest("div.grid")).toHaveClass("sm:grid-cols-2");
    expect(screen.getByLabelText("연락처").closest("div.grid")).toBe(
      screen.getByLabelText("직원이름").closest("div.grid"),
    );
    expect(screen.getByLabelText("직군").closest("div.grid")).toHaveClass("sm:grid-cols-2");
    expect(screen.getByLabelText("근무형태").closest("div.grid")).toBe(
      screen.getByLabelText("직군").closest("div.grid"),
    );
    expect(screen.getByRole("checkbox", { name: "퇴직" })).not.toBeChecked();
    const employeeEducationSection = await screen.findByRole("region", { name: "교육이수 및 근무지배정 정보" });
    expect(within(employeeEducationSection).getByText("본사")).toBeInTheDocument();
    expect(within(employeeEducationSection).getByRole("table")).toBeInTheDocument();
    expect(within(employeeEducationSection).getByRole("link", { name: "2026-05-21 ~ 2026-05-23" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments/save/assignment-1",
    );
    expect(within(employeeEducationSection).getByRole("link", { name: "1/3" })).toHaveAttribute(
      "href",
      "/manager/safety/completions/detail?name=Alice",
    );
    expect(within(employeeEducationSection).getByRole("heading", { name: "교육이수" }).parentElement).toContainElement(
      within(employeeEducationSection).getByRole("link", { name: "1/3" }),
    );
    const attendanceSection = screen.getByRole("region", { name: "출근현황" });
    expect(within(attendanceSection).getByText("본사")).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "출근일시" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "퇴근일시" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "출근예정" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "퇴근예정" })).toBeInTheDocument();
    expect(within(attendanceSection).getByRole("columnheader", { name: "상태" })).toBeInTheDocument();
    expect(within(attendanceSection).getByText("정상출근")).toBeInTheDocument();
    const leaveSection = screen.getByRole("region", { name: "휴가정보" });
    expect(within(leaveSection).getByText("연차")).toBeInTheDocument();
    expect(within(leaveSection).getByText("2026-06-01 ~ 2026-06-02")).toBeInTheDocument();
    const inspectionSection = screen.getByRole("region", { name: "현장점검" });
    expect(within(inspectionSection).getByText("정문")).toBeInTheDocument();
    expect(within(inspectionSection).getByText("본사")).toBeInTheDocument();
    const remarksSection = screen.getByRole("region", { name: "특이사항" });
    expect(within(remarksSection).getByText("엘리베이터 이상")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("직원이름"));
    await user.type(screen.getByLabelText("직원이름"), "Alice Kim");
    await user.clear(screen.getByLabelText("연락처"));
    await user.type(screen.getByLabelText("연락처"), "010-9999-8888");
    await user.click(screen.getByRole("checkbox", { name: "퇴직" }));
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByText("변경사항을 저장하시겠습니까?")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "아니오" }));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByDisplayValue("Alice Kim")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "저장" }));
    await user.click(screen.getByRole("button", { name: "예" }));

    expect(await screen.findByText("수정이 완료되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });

  it("does not render the assignment section when the employee has no assignments", async () => {
    employeeAssignments = [];

    render(<EmployeeSavePage />);

    expect(await screen.findByRole("heading", { name: "직원 상세" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "교육이수 및 근무지배정 정보" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "근무지배정 정보" })).not.toBeInTheDocument();
  });

  it("hides history sections that have no records", async () => {
    employeeDetails = {
      educationCompletions: [],
      attendance: [],
      leaves: [],
      inspectionLogs: [],
      specialRemarks: [],
    };

    render(<EmployeeSavePage />);

    expect(await screen.findByRole("heading", { name: "직원 상세" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "교육이수 및 근무지배정 정보" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "출근현황" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "휴가정보" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "현장점검" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "특이사항" })).toBeInTheDocument();
  });

  it("returns to the list without saving", async () => {
    const user = userEvent.setup();
    render(<EmployeeSavePage />);
    await screen.findByDisplayValue("Alice");
    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("confirms and deletes the employee", async () => {
    const user = userEvent.setup();
    employeeAssignments = [];

    render(<EmployeeSavePage />);

    expect(await screen.findByRole("heading", { name: "직원 상세" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(screen.getByText("현재자료를 삭제할까요?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "예" }));

    expect(push).toHaveBeenCalledWith("/manager/employee/employees");
  });

  it("blocks employee deletion when assignments exist", async () => {
    const user = userEvent.setup();

    render(<EmployeeSavePage />);

    await screen.findByRole("heading", { name: "직원 상세" });
    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("해당직원의 근무지배정 정보가 있습니다.");
    expect(screen.queryByText("현재자료를 삭제할까요?")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith("/api/employees/emp-1", expect.objectContaining({ method: "DELETE" }));
  });
});
