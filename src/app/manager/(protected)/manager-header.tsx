"use client";

import { useEffect, useState } from "react";
import type { UserResponse } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import Link from "next/link";

export default function ManagerHeader() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createSupabaseBrowserClient();
    if (supabase.auth && typeof supabase.auth.getUser === "function") {
      supabase.auth.getUser().then((response: UserResponse) => {
        const user = response.data?.user;
        if (active && user?.email) {
          setEmail(user.email);
        }
      }).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  return (
    <h2 className="text-[21px] font-semibold">
      <Link href="/manager" className="hover:opacity-80 transition-opacity">
        관리자
        {email ? (
          <span className="text-[11px] font-normal text-ink/60 ml-1.5">
            ({email})
          </span>
        ) : null}
      </Link>
    </h2>
  );
}
