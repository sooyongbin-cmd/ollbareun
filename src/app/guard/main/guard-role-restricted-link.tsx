"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useGuardRoleAccess } from "./use-guard-role-access";

type GuardRoleRestrictedLinkProps = {
  children: ReactNode;
  href: string;
};

export default function GuardRoleRestrictedLink({ children, href }: GuardRoleRestrictedLinkProps) {
  const hasAccess = useGuardRoleAccess();

  return hasAccess ? (
    <Link className="guard-menu-button" href={href}>
      {children}
    </Link>
  ) : (
    <button aria-disabled="true" className="guard-menu-button" disabled type="button">
      {children}
    </button>
  );
}
