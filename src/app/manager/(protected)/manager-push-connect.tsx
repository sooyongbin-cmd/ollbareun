"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}

export default function ManagerPushConnect() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("관리자 푸시 알림을 연결합니다.");

  async function handleConnect() {
    if (status === "connecting") {
      return;
    }

    setStatus("connecting");
    setStatusMessage("푸시 알림 연결을 준비하고 있습니다.");

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error("이 브라우저는 푸시 알림을 지원하지 않습니다.");
      }

      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("브라우저 알림 권한을 허용해야 푸시를 받을 수 있습니다.");
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error("푸시 알림 공개키가 설정되지 않았습니다.");
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch("/api/manager/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "관리자 푸시 구독을 저장하지 못했습니다.");
      }

      setStatus("connected");
      setStatusMessage("이 기기에서 관리자 푸시 알림을 받을 수 있습니다.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "푸시 알림 연결에 실패했습니다.");
    }
  }

  const label =
    status === "connecting"
      ? "연결 중"
      : status === "connected"
        ? "푸시 연결됨"
        : status === "error"
          ? "연결 재시도"
          : "푸시 알림 연결";

  return (
    <Button
      aria-label={label}
      className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-70"
      disabled={status === "connecting"}
      onClick={handleConnect}
      title={statusMessage}
      type="button"
      variant="outline"
    >
      {status === "connecting" ? (
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
      ) : status === "error" ? (
        <BellOff aria-hidden="true" className="size-3.5 text-destructive" />
      ) : (
        <Bell aria-hidden="true" className="size-3.5" />
      )}
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only" aria-live="polite">
        {statusMessage}
      </span>
    </Button>
  );
}
