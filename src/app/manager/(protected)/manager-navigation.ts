import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BellRing,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  MessageSquareWarning,
  Settings,
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
      { label: "직원명부관리", href: "/manager/employee/employees", icon: Users },
      { label: "근무지관리", href: "/manager/employee/worksites", icon: Building2 },
      { label: "근무지배정", href: "/manager/employee/assignments", icon: UserRoundCheck },
    ],
  },
  {
    label: "현장점검",
    icon: ClipboardCheck,
    items: [
      { label: "현장관리", href: "/manager/inspection/sites", icon: MapPinned },
      { label: "현장점검현황", href: "/manager/inspection/logs", icon: ListChecks },
      { label: "특이사항", href: "/manager/inspection/special-remarks", icon: MessageSquareWarning },
    ],
  },
  {
    label: "안전교육",
    icon: GraduationCap,
    items: [
      { label: "교육자료관리", href: "/manager/safty/resources", icon: BookOpen },
      { label: "교육이수관리", href: "/manager/safty/completions", icon: GraduationCap },
      { label: "자동알림", href: "/manager/safty/notifications", icon: BellRing },
    ],
  },
  {
    label: "리포트출력",
    icon: FileClock,
    items: [
      { label: "근태내역", href: "/manager/reports/attendance", icon: FileClock },
      { label: "교육이수자료", href: "/manager/reports/education", icon: FileCheck2 },
    ],
  },
  {
    label: "시스템",
    icon: Settings,
    items: [
      { label: "로그현황", href: "/manager/system/logs", icon: Activity },
      { label: "패스키 요청 관리", href: "/manager/system/passkeys", icon: KeyRound },
      { label: "관리자관리", href: "/manager/system/admin-users", icon: ShieldCheck },
      { label: "시스템설정", href: "/manager/system/configs", icon: Settings },
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

  for (const group of managerNavigationGroups) {
    const item = group.items.find((candidate) => isManagerPathActive(currentPath, candidate.href));
    if (item) {
      return { group, item };
    }
  }

  return { group: null, item: dashboardNavigationItem };
}
