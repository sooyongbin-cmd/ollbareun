import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DailyEducationPage from "./page";

afterEach(() => vi.unstubAllGlobals());

it("sets linked name and work date before fetching and filters the daily list", async () => {
  const fetchMock = vi.fn(async () => Response.json({ rows: [
    { employeeId: "a", employeeName: "홍길동", workDate: "2026-10-23" },
    { employeeId: "b", employeeName: "김철수", workDate: "2026-10-23" },
  ] }));
  vi.stubGlobal("fetch", fetchMock);
  render(await DailyEducationPage({ searchParams: Promise.resolve({ name: "홍길동", workDate: "2026-10-23" }) }));
  expect(screen.getByLabelText("이름")).toHaveValue("홍길동");
  expect(screen.getByLabelText("근무일")).toHaveValue("2026-10-23");
  await screen.findByRole("cell", { name: /홍길동/ });
  expect(screen.queryByRole("cell", { name: /김철수/ })).not.toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("/api/manager/safety-education?view=daily&date=2026-10-23");
});

it.each([undefined, "2026-02-30", "invalid"])("defaults to today when the linked date is %s", async (workDate) => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ rows: [] })));
  render(await DailyEducationPage({ searchParams: Promise.resolve({ workDate }) }));
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  expect(screen.getByLabelText("근무일")).toHaveValue(today);
  expect(screen.getByLabelText("이름")).toHaveValue("");
  await screen.findByText("조회 결과 0");
});
