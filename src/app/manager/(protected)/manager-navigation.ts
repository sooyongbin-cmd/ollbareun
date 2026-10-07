import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileClock,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  MessageSquareWarning,
  Settings,
  Database,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";

export type ManagerNavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type ManagerNavigationGroup = {
  label: string;
  icon: LucideIcon;
  items: ManagerNavigationItem[];
};

export const dashboardNavigationItem: ManagerNavigationItem = {
  label: "대시보드",
  href: "/manager",
  icon: LayoutDashboard,
};

export const managerNavigationGroups: ManagerNavigationGroup[] = [
  {
    label: "직원관리",
    icon: Users,
    items: [
      { label: "직원관리", href: "/manager/employee/employees", icon: Users },
      { label: "근무지관리", href: "/manager/employee/worksites", icon: Building2 },
      { label: "근무지배정", href: "/manager/employee/assignments", icon: UserRoundCheck },
      { label: "공휴일관리", href: "/manager/employee/holidays", icon: CalendarDays },
    ],
  },
  {
    label: "근태관리",
    icon: Activity,
    items: [
      { label: "근태관리", href: "/manager/reports/attendance", icon: FileClock },
      { label: "휴가관리", href: "/manager/leave", icon: CalendarDays },
    ],
  },
  {
    label: "점검지점검",
    icon: ClipboardCheck,
    items: [
      { label: "점검지관리", href: "/manager/inspection/sites", icon: MapPinned },
      { label: "점검지점검현황", href: "/manager/inspection/logs", icon: ListChecks },
      { label: "특이사항", href: "/manager/inspection/special-remarks", icon: MessageSquareWarning },
    ],
  },
  {
    label: "안전교육",
    icon: GraduationCap,
    items: [
      { label: "교육자료관리", href: "/manager/safety/resources", icon: BookOpen },
      { label: "일일교육이수", href: "/manager/safety/daily_edu", icon: CalendarDays },
      { label: "월별교육이수", href: "/manager/safety/monthly_edu", icon: CalendarDays },
    ],
  },
  {
    label: "시스템",
    icon: Settings,
    items: [
      { label: "관리자관리", href: "/manager/system/admin-users", icon: ShieldCheck },
      { label: "시스템설정", href: "/manager/system/configs", icon: Settings },
      { label: "자료관리", href: "/manager/system/data-manage", icon: Database },
    ],
  },
];

export function isManagerPathActive(pathname: string | null, href: string) {
  const currentPath = pathname ?? "/manager";

  if (href === "/manager") {
    return currentPath === href;
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function findManagerNavigation(pathname: string | null) {
  const currentPath = pathname ?? "/manager";

  if (currentPath === dashboardNavigationItem.href) {
    return { group: null, item: dashboardNavigationItem };
  }

  const matches = managerNavigationGroups.flatMap((group) =>
    group.items
      .filter((candidate) => isManagerPathActive(currentPath, candidate.href))
      .map((item) => ({ group, item })),
  );
  const mostSpecificMatch = matches.sort((a, b) => b.item.href.length - a.item.href.length)[0];

  if (mostSpecificMatch) {
    return mostSpecificMatch;
  }

  return { group: null, item: dashboardNavigationItem };
}
