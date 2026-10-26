import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import DetailModalLink from "./detail-modal-link";
import EmployeeRoster from "@/app/manager/(protected)/employee/employees/page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  useParams: () => ({ id: "wrong-route-id" }),
  useSearchParams: () => new URLSearchParams(),
}));

const employee = { id: "record-1", name: "홍길동", birthdate: "1975-06-15", phone: "01012345678", role: "경비원", work_style: "0", in_time: "08:00", out_time: 1080, is_retired: false, retired_at: null };
const worksite = { id: "work-1", name: "본사", address: "서울특별시", gps_info: { latitude: 37.5, longitude: 127 }, radius_meters: 100 };
const config = { system_code: "record-1", parent_system_code: null, description: "테스트 설정", content: "내용" };

function mockPayload(url: string) {
  if (url === "/api/bootstrap") return { employees: [employee], worksites: [worksite], assignments: [] };
  if (url.endsWith("/api/employee-roles")) return { roles: ["경비원"] };
  if (url.startsWith("/api/employees/")) return { employee, assignments: [], educationCompletions: [], attendance: [], leaves: [], inspectionLogs: [], specialRemarks: [] };
  if (url.startsWith("/api/worksites/")) return url.endsWith("/assignments") ? { assignments: [] } : { worksite };
  if (url.startsWith("/api/assignments/")) return { assignment: { id: "record-1", employee_id: employee.id, worksite_id: worksite.id, start_date: "2026-10-01", end_date: "2026-10-31", work_style: "0", in_time: "08:00", out_time: 1080 } };
  if (url.startsWith("/api/manager/assignments/")) return { dailyAttendance: [], attendances: [] };
  if (url.startsWith("/api/manager/holidays")) return { holidays: [] };
  if (url.startsWith("/api/inspection/sites/")) return { site: { id: "record-1", name: "정문", worksite_id: worksite.id } };
  if (url.startsWith("/api/education/resources/")) return { resource: { id: "record-1", title: "안전교육", youtube_link: "https://www.youtube.com/watch?v=test", education_type: "daily", startdate: "2026-10-01", enddate: "2026-10-31" } };
  if (url.startsWith("/api/leave/")) return { leave: { id: "record-1", employeeId: employee.id, employeeName: employee.name, leaveType: "연차", startDate: "2026-10-01", endDate: "2026-10-01" } };
  if (url.startsWith("/api/inspection/special-remarks/")) return { report: { id: "record-1", employee_name: employee.name, reported_at: "2026-10-01T09:00:00+09:00", content: "특이사항", processing_status: "N", photo_url: null, gps_info: null } };
  if (url.startsWith("/api/manager/reports/attendance/")) return { attendance: { id: "record-1", workDate: "2026-10-01", employeeName: employee.name, worksiteName: worksite.name, intimeStatus: "0", clockInDateTime: null, clockOutDateTime: null }, education: [] };
  if (url.startsWith("/api/manager/admin-users/")) return { admin: { id: "record-1", email: "admin@example.com", role: "admin" }, canEdit: true };
  if (url === "/api/system/configs") return { configs: [{ ...config, system_code: "THEME_CODE" }] };
  if (url.startsWith("/api/system/configs/")) return { config };
  return {};
}

beforeEach(() => {
  push.mockReset();
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json(mockPayload(String(input)))));
});

it.each([
  ["employee/employees/save", "직원 상세", "/api/employees/record-1"],
  ["employee/worksites/save", "근무지 상세", "/api/worksites/record-1"],
  ["employee/assignments/save", "근무지배정 상세", "/api/assignments/record-1"],
  ["inspection/sites", "점검지 상세", "/api/inspection/sites/record-1"],
  ["safety/resources/save", "교육자료 상세", "/api/education/resources/record-1"],
  ["leave", "휴가상세", "/api/leave/record-1"],
  ["inspection/special-remarks", "특이사항 상세", "/api/inspection/special-remarks/record-1"],
  ["reports/attendance/detail", "근태상세", "/api/manager/reports/attendance/record-1"],
  ["system/admin-users/save", "관리자 상세", "/api/manager/admin-users/record-1"],
  ["system/configs", "시스템설정 상세", "/api/system/configs/record-1"],
])("opens %s with its record ID and closes without navigation", async (path, title, endpoint) => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<DetailModalLink href={`/manager/${path}/record-1`} onSaved={onSaved}>상세 보기</DetailModalLink>);
  const link = screen.getByRole("link", { name: "상세 보기" });
  await user.click(link);
  const dialog = await screen.findByRole("dialog", { name: title });
  await user.click(await within(dialog).findByRole("button", { name: "닫기" }));
  expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url) === endpoint)).toBe(true);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(link).toHaveFocus();
  expect(push).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});

it("keeps employee details open after saving and refreshes the filtered roster on close", async () => {
  const user = userEvent.setup();
  let phone = employee.phone;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/employees/record-1" && init?.method === "PATCH") phone = JSON.parse(String(init.body)).phone;
    const payload = mockPayload(url);
    if (url === "/api/bootstrap") return Response.json({ ...payload, employees: [{ ...employee, phone }] });
    if (url === "/api/employees/record-1") return Response.json({ ...payload, employee: { ...employee, phone } });
    return Response.json(payload);
  }));
  render(<EmployeeRoster />);
  await screen.findByRole("link", { name: "홍길동" });
  await user.type(screen.getByLabelText("이름"), "홍");
  await user.click(screen.getByRole("link", { name: "홍길동" }));
  const dialog = await screen.findByRole("dialog", { name: "직원 상세" });
  const phoneInput = await within(dialog).findByLabelText("연락처");
  await user.clear(phoneInput);
  await user.type(phoneInput, "01099998888");
  await user.click(within(dialog).getByRole("button", { name: "저장" }));
  await user.click(await screen.findByRole("button", { name: "예" }));
  await user.click(await screen.findByRole("button", { name: "확인" }));
  expect(screen.getByRole("dialog", { name: "직원 상세" })).toBeInTheDocument();
  expect(phoneInput).toHaveValue("010-9999-8888");
  await user.click(within(dialog).getByRole("button", { name: "닫기" }));
  expect(await screen.findByText("010-9999-8888")).toBeInTheDocument();
  expect(screen.getByLabelText("이름")).toHaveValue("홍");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

it("closes and reports a change after a confirmed leave deletion", async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<DetailModalLink href="/manager/leave/record-1" onSaved={onSaved}>휴가</DetailModalLink>);
  await user.click(screen.getByRole("link", { name: "휴가" }));
  const dialog = await screen.findByRole("dialog", { name: "휴가상세" });
  await user.click(await within(dialog).findByRole("button", { name: "삭제" }));
  await user.click(await screen.findByRole("button", { name: "예" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

it("allows closing when the detail request fails", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "조회 실패" }, { status: 404 })));
  render(<DetailModalLink href="/manager/employee/employees/save/missing">직원</DetailModalLink>);
  await user.click(screen.getByRole("link", { name: "직원" }));
  expect(await screen.findByText("조회 실패")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("keeps administrator details open when saving fails", async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    init?.method === "PATCH" ? Response.json({ error: "저장 실패" }, { status: 400 }) : Response.json(mockPayload(String(input))),
  ));
  render(<DetailModalLink href="/manager/system/admin-users/save/record-1" onSaved={onSaved}>관리자</DetailModalLink>);
  await user.click(screen.getByRole("link", { name: "관리자" }));
  const dialog = await screen.findByRole("dialog", { name: "관리자 상세" });
  await user.click(await within(dialog).findByRole("button", { name: "저장" }));
  expect(await screen.findByText("저장 실패")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "확인" }));
  expect(screen.getByRole("dialog", { name: "관리자 상세" })).toBeInTheDocument();
  expect(onSaved).not.toHaveBeenCalled();
});

it("edits the local theme through the modal without a server mutation", async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<DetailModalLink href="/manager/system/configs/THEME_CODE" onSaved={onSaved}>테마</DetailModalLink>);
  await user.click(screen.getByRole("link", { name: "테마" }));
  const dialog = await screen.findByRole("dialog", { name: "시스템설정 상세" });
  await user.click(await within(dialog).findByRole("radio", { name: "dark" }));
  await user.click(within(dialog).getByRole("button", { name: "저장" }));
  expect(screen.getByRole("dialog", { name: "시스템설정 상세" })).toBeInTheDocument();
  expect(onSaved).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "닫기" }));
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  expect(push).not.toHaveBeenCalled();
});

it("refreshes the list on close after education completion within attendance details", async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => Response.json({
    ...mockPayload(String(input)),
    education: [{ resourceId: "resource-1", title: "안전교육", educationType: "daily", isCompleted: false }],
  })));
  render(<DetailModalLink href="/manager/reports/attendance/detail/record-1" onSaved={onSaved}>근태</DetailModalLink>);
  await user.click(screen.getByRole("link", { name: "근태" }));
  const dialog = await screen.findByRole("dialog", { name: "근태상세" });
  await user.click(await within(dialog).findByRole("button", { name: "안전교육 이수 처리" }));
  expect(await within(dialog).findByText("이수", { selector: "span" })).toBeInTheDocument();
  expect(onSaved).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "닫기" }));
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(push).not.toHaveBeenCalled();
});

it("refreshes nested assignment rows while preserving unsaved employee inputs", async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  let deleted = false;
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/assignments/assignment-1" && init?.method === "DELETE") deleted = true;
    const payload = mockPayload(url);
    if (url === "/api/employees/record-1") return Response.json({ ...payload, assignments: deleted ? [] : [
      { id: "assignment-1", worksite_name: "본사", start_date: "2026-10-01", end_date: "2026-10-31" },
    ] });
    return Response.json(payload);
  }));
  render(<DetailModalLink href="/manager/employee/employees/save/record-1" onSaved={onSaved}>직원</DetailModalLink>);
  await user.click(screen.getByRole("link", { name: "직원" }));
  const employeeDialog = await screen.findByRole("dialog", { name: "직원 상세" });
  const phone = await within(employeeDialog).findByLabelText("연락처");
  await user.clear(phone);
  await user.type(phone, "01099998888");
  await user.click(within(employeeDialog).getByRole("link", { name: "2026-10-01 ~ 2026-10-31" }));
  const assignmentDialog = await screen.findByRole("dialog", { name: "근무지배정 상세" });
  const remove = await within(assignmentDialog).findByRole("button", { name: "삭제" });
  await waitFor(() => expect(remove).toBeEnabled());
  await user.click(remove);
  await user.click(await screen.findByRole("button", { name: "예" }));
  await user.click(await screen.findByRole("button", { name: "확인" }));
  await waitFor(() => expect(within(employeeDialog).queryByRole("region", { name: "근무지배정정보" })).not.toBeInTheDocument());
  expect(phone).toHaveValue("010-9999-8888");
  expect(onSaved).not.toHaveBeenCalled();
  await user.click(within(employeeDialog).getByRole("button", { name: "닫기" }));
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(push).not.toHaveBeenCalled();
});

it.each([
  ["employee/worksites/save", "근무지 상세", "/api/worksites/record-1", true],
  ["employee/assignments/save", "근무지배정 상세", "/api/assignments/record-1", true],
  ["inspection/sites", "점검지 상세", "/api/inspection/sites/record-1", true],
  ["safety/resources/save", "교육자료 상세", "/api/education/resources/record-1", true],
  ["system/admin-users/save", "관리자 상세", "/api/manager/admin-users/record-1", false],
  ["system/configs", "시스템설정 상세", "/api/system/configs/record-1", false],
  ["reports/attendance/detail", "근태상세", "/api/manager/reports/attendance/record-1", true],
])("keeps %s open after save confirmation, then refreshes the list on close", async (path, title, endpoint, hasNotice) => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<DetailModalLink href={`/manager/${path}/record-1`} onSaved={onSaved}>상세</DetailModalLink>);
  await user.click(screen.getByRole("link", { name: "상세" }));
  const dialog = await screen.findByRole("dialog", { name: title });
  const save = await within(dialog).findByRole("button", { name: "저장" });
  await waitFor(() => expect(save).toBeEnabled());
  if (path === "reports/attendance/detail") {
    fireEvent.change(within(dialog).getByLabelText("출근일시"), { target: { value: "2026-10-01T08:00" } });
  }
  await user.click(save);
  if (path === "reports/attendance/detail") await user.click(await screen.findByRole("button", { name: "예" }));
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.some(([url, init]) => String(url) === endpoint && init?.method === "PATCH")).toBe(true));
  if (hasNotice) await user.click(await screen.findByRole("button", { name: "확인" }));
  expect(screen.getByRole("dialog", { name: title })).toBeInTheDocument();
  expect(onSaved).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  await user.click(within(dialog).getByRole("button", { name: "닫기" }));
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it.each([
  ["employee/worksites/save", "근무지 상세", true],
  ["inspection/sites", "점검지 상세", true],
  ["safety/resources/save", "교육자료 상세", true],
  ["system/admin-users/save", "관리자 상세", false],
  ["system/configs", "시스템설정 상세", false],
])("still closes %s after confirmed deletion", async (path, title, hasNotice) => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<DetailModalLink href={`/manager/${path}/record-1`} onSaved={onSaved}>상세</DetailModalLink>);
  await user.click(screen.getByRole("link", { name: "상세" }));
  const dialog = await screen.findByRole("dialog", { name: title });
  await user.click(await within(dialog).findByRole("button", { name: "삭제" }));
  await user.click(await screen.findByRole("button", { name: "예" }));
  if (hasNotice) await user.click(await screen.findByRole("button", { name: "확인" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(push).not.toHaveBeenCalled();
});

it("keeps a completed special remark open and shows its new status", async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const payload = mockPayload(String(input));
    return Response.json(init?.method === "PATCH" ? { report: { ...payload.report, processing_status: "Y" } } : payload);
  }));
  try {
    render(<DetailModalLink href="/manager/inspection/special-remarks/record-1" onSaved={onSaved}>특이사항</DetailModalLink>);
    await user.click(screen.getByRole("link", { name: "특이사항" }));
    const dialog = await screen.findByRole("dialog", { name: "특이사항 상세" });
    await user.click(await within(dialog).findByRole("button", { name: "처리완료" }));
    expect(await within(dialog).findByText("처리완료", { selector: "p" })).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "닫기" }));
    expect(onSaved).toHaveBeenCalledTimes(1);
  } finally {
    confirm.mockRestore();
  }
});
