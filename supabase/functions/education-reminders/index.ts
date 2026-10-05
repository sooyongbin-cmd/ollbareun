import { requestEducationReminders } from "./reminder-client.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function formatKstDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatKstTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

Deno.serve(async (request) => {
  const cronSecret = requireEnv("EDUCATION_REMINDER_CRON_SECRET");
  if (request.headers.get("x-cron-secret") !== cronSecret) {
    return jsonResponse({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  // 한국 시간 값을 실행 응답에 포함합니다.
  const scheduledDate = formatKstDate(now);
  const scheduledTime = formatKstTime(now);

  try {
    const result = await requestEducationReminders({
      apiUrl: requireEnv("EDUCATION_REMINDER_API_URL"),
      cronSecret,
    });

    return jsonResponse({
      ...result,
      scheduledDate,
      scheduledTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "안전교육 자동알림 발송 중 오류가 발생했습니다.";

    return jsonResponse({ error: errorMessage, scheduledDate, scheduledTime }, { status: 500 });
  }
});
