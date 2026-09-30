"use client";

import Link from "next/link";
import { useGuardPatrolVisibility } from "./use-guard-patrol-visibility";

export default function GuardPatrolLink() {
  const visible = useGuardPatrolVisibility();

  return visible ? (
    <Link className="guard-menu-button" href="/guard/main/work">
      순찰
    </Link>
  ) : (
    <button aria-disabled="true" className="guard-menu-button" disabled type="button">
      순찰
    </button>
  );
}
