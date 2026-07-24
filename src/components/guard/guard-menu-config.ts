import { ComponentType } from "react";
import {
  Clock,
  QrCode,
  Radio,
  ShieldCheck,
  FileText,
  User,
  LucideProps,
} from "lucide-react";

export interface GuardMenuItemConfig {
  href: string;
  title: string | ((role: string) => string);
  description: string;
  icon: ComponentType<LucideProps>;
  roles?: string[];
  requiresWorksite: boolean;
  requiresLocation: boolean;
}

export const GUARD_WORK_MENUS: GuardMenuItemConfig[] = [
  {
    href: "/guard/main/attendance",
    title: "출퇴근",
    description: "위치 기반 출근 및 퇴근 처리",
    icon: Clock,
    roles: ["경비원", "미화원", "파견"],
    requiresWorksite: true,
    requiresLocation: true,
  },
  {
    href: "/guard/main/inspection",
    title: (role: string) => (role === "미화원" ? "청소구역(QR코드)" : "순찰(QR코드)"),
    description: "QR 코드를 스캔하여 현장 점검 기록",
    icon: QrCode,
    roles: ["경비원", "미화원"],
    requiresWorksite: true,
    requiresLocation: true,
  },
  {
    href: "/guard/main/inspection-nfc",
    title: (role: string) => (role === "미화원" ? "청소구역(NFC태그)" : "순찰(NFC태그)"),
    description: "NFC 태그를 대어 현장 점검 기록",
    icon: Radio,
    roles: ["경비원", "미화원"],
    requiresWorksite: true,
    requiresLocation: true,
  },
  {
    href: "/guard/main/safety",
    title: "안전교육",
    description: "법정 안전교육 영상 시청 및 이수",
    icon: ShieldCheck,
    roles: ["경비원", "미화원", "파견"],
    requiresWorksite: false,
    requiresLocation: false,
  },
  {
    href: "/guard/main/special-remarks",
    title: "특이사항",
    description: "현장 특이사항 및 사진 보고",
    icon: FileText,
    roles: ["경비원", "미화원", "파견"],
    requiresWorksite: true,
    requiresLocation: false,
  },
  {
    href: "/guard/main/profile",
    title: "개인프로필",
    description: "근무 스케줄, 근태 기록, 설정",
    icon: User,
    roles: ["경비원", "미화원", "파견"],
    requiresWorksite: false,
    requiresLocation: false,
  },
];

export function getGuardMenuTitle(
  menu: GuardMenuItemConfig,
  role: string = "경비원"
): string {
  if (typeof menu.title === "function") {
    return menu.title(role);
  }
  return menu.title;
}

export function isGuardMenuVisibleForRole(
  menu: GuardMenuItemConfig,
  role: string = "경비원"
): boolean {
  if (!menu.roles || menu.roles.length === 0) return true;
  return menu.roles.includes(role);
}

export function findGuardMenuByHref(href: string): GuardMenuItemConfig | undefined {
  return GUARD_WORK_MENUS.find((m) => m.href === href);
}
