"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { collectDetailChanges, type DetailChange } from "@/lib/detail-changes";
import { Button } from "@/components/ui/button";

type Commit = (apply: () => void) => void;

/** Retain failed changes for retry and ignore responses from an older filter/request. */
export function usePartialDetailUpdate(update: (changes: DetailChange[], commit: Commit) => Promise<void>, scope = "") {
  const pending = useRef<DetailChange[]>([]);
  const generation = useRef(0);
  const mounted = useRef(true);
  const scopeToken = useMemo(() => ({ scope }), [scope]);
  const [failure, setFailure] = useState({ token: scopeToken, message: "" });
  useLayoutEffect(() => {
    mounted.current = true;
    generation.current++;
    pending.current = [];
    return () => { mounted.current = false; };
  }, [scopeToken]);
  const run = useCallback(async (changes: DetailChange[] = []) => {
    pending.current = collectDetailChanges(pending.current, changes);
    if (!pending.current.length) return;
    const request = ++generation.current;
    const current = () => mounted.current && generation.current === request;
    setFailure({ token: scopeToken, message: "" });
    try {
      await update(pending.current, (apply) => { if (current()) apply(); });
      if (current()) pending.current = [];
    } catch (cause) {
      if (current()) setFailure({ token: scopeToken, message: cause instanceof Error ? cause.message : "변경된 자료를 반영하지 못했습니다." });
    }
  }, [update, scopeToken]);
  return { onSaved: (changes: DetailChange[]) => { void run(changes); }, error: failure.token === scopeToken ? failure.message : "",
    retry: () => { void run(); } };
}

export function PartialUpdateStatus({ error, retry }: { error: string; retry: () => void }) {
  return error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/30 p-3 text-sm text-destructive">
    <span>변경된 자료 반영에 실패했습니다. {error}</span>
    <Button type="button" variant="outline" onClick={retry}>다시 반영</Button>
  </div> : null;
}

export async function fetchDetailJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "변경된 자료를 불러오지 못했습니다.");
  return payload as T;
}
