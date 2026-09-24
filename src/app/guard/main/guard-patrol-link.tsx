"use client";

import Link from "next/link";
import { useGuardPatrolVisibility } from "./use-guard-patrol-visibility";

export default function GuardPatrolLink() {
  const visible = useGuardPatrolVisibility();
  if (!visible) return null;

  return (
    <Link className="guard-menu-button" href="/guard/main/work">
      순찰
    </Link>
  );
}
