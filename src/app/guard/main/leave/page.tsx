"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import LoadingBoard from "@/components/loading-board";
import styles from "../safety/page.module.css";

type LeaveInput = { startDate: string; endDate: string; leaveType: string };

function initialLeaveInput(): LeaveInput {
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })
    .format(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return { startDate: tomorrow, endDate: tomorrow, leaveType: "월차" };
}

export default function GuardLeavePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const savingRef = useRef(false);
  const [values, setValues] = useState(initialLeaveInput);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [pending, setPending] = useState<LeaveInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadTypes() {
      try {
        const response = await fetch("/api/guard/leave", { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "휴가구분을 불러오지 못했습니다.");
        if (!controller.signal.aborted) {
          const nextTypes: string[] = payload.types ?? [];
          setTypes(nextTypes);
          setValues((current) => ({ ...current, leaveType: nextTypes.includes("월차") ? "월차" : "" }));
        }
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "휴가구분을 불러오지 못했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadTypes();
    return () => controller.abort();
  }, []);

  function requestConfirmation() {
    if (loading || savingRef.current || pending || !formRef.current?.reportValidity()) return;
    if (values.startDate > values.endDate) {
      setError("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    setError("");
    setPending({ ...values });
  }

  async function submitLeave() {
    if (!pending || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    setErrorModalMessage("");
    try {
      const response = await fetch("/api/guard/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "휴가를 신청하지 못했습니다.");
      const delivery = payload.delivery;
      setMessage(delivery?.error || !delivery?.successCount
        ? "휴가신청이 완료되었습니다. 관리자 푸시알림을 전달하지 못했지만 신청 내역은 저장되었습니다."
        : delivery.failedCount > 0 || delivery.unregisteredCount > 0
          ? "휴가신청이 완료되었습니다. 일부 관리자에게 푸시알림을 전달하지 못했지만 신청 내역은 저장되었습니다."
          : "휴가신청이 완료되었으며 관리자에게 푸시알림을 전송했습니다.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "휴가를 신청하지 못했습니다.";
      if (errorMessage === "휴가신청기간이 겹칩니다.") {
        setErrorModalMessage(errorMessage);
      } else {
        setError(errorMessage);
      }
    } finally {
      setPending(null);
      savingRef.current = false;
      setSaving(false);
    }
  }

  const confirmation = pending
    ? pending.startDate === pending.endDate
      ? `날짜 (${pending.startDate}) 에 휴가신청을 하시겠습니까?`
      : `기간 (${pending.startDate}~${pending.endDate}) 에 휴가신청을 하시겠습니까?`
    : "";

  return (
    <main className={styles.safetyPage}>
      <section aria-label="휴가신청" className={styles.safetyCard}>
        <div className={styles.headingRow}>
          <h1 className={styles.heading}>휴가신청</h1>
        </div>
        <div className={styles.description}>
          <p className={styles.descriptionText}>
            휴가기간을 설정하고 신청하세요. 하루 휴가는 시작과 종료일이 같으면 됩니다.
          </p>
        </div>
        <div className={styles.educationList} aria-label="휴가신청 자료">
          {loading ? <LoadingBoard className={styles.loading} label="휴가구분을 불러오는 중입니다." /> : (
            <form ref={formRef} className="contents" onSubmit={(event) => { event.preventDefault(); requestConfirmation(); }}>
              <fieldset className="space-y-2" disabled={saving || Boolean(pending) || Boolean(message)}>
                <legend>휴가기간</legend>
                <div className="flex min-w-0 items-center gap-2">
                  <Input aria-label="시작일" type="date" className="min-w-0 flex-1" value={values.startDate}
                    onChange={(event) => setValues((current) => ({ ...current, startDate: event.target.value }))} required />
                  <span>~</span>
                  <Input aria-label="종료일" type="date" className="min-w-0 flex-1" value={values.endDate}
                    onChange={(event) => setValues((current) => ({ ...current, endDate: event.target.value }))} required />
                </div>
              </fieldset>
              <div className="space-y-2">
                <label htmlFor="guard-leave-type">휴가구분</label>
                <NativeSelect id="guard-leave-type" value={values.leaveType} disabled={saving || Boolean(pending) || Boolean(message)}
                  onChange={(event) => setValues((current) => ({ ...current, leaveType: event.target.value }))} required>
                  <NativeSelectOption value="">선택하세요.</NativeSelectOption>
                  {types.map((type) => <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>)}
                </NativeSelect>
              </div>
              <Button className="w-full guard-general-button" type="button" onClick={requestConfirmation}
                disabled={saving || Boolean(pending) || Boolean(message) || types.length === 0}>
                휴가신청
              </Button>
            </form>
          )}
        </div>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </section>
      <ConfirmModal isOpen={Boolean(pending)} onClose={() => setPending(null)} onConfirm={submitLeave}
        title="휴가신청" description={confirmation} loading={saving} loadingLabel="휴가신청을 저장하고 있습니다..." />
      <AlertModal isOpen={Boolean(errorModalMessage)} title="휴가신청 오류" description={errorModalMessage}
        onClose={() => setErrorModalMessage("")} />
      <AlertModal isOpen={Boolean(message)} title="알림" description={message} onClose={() => router.push("/guard/main")} />
    </main>
  );
}
