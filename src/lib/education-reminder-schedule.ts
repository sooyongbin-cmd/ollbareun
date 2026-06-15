const dailyPushTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseDailyPushMessageTimes(content: string) {
  return content
    .split(",")
    .map((time) => time.trim())
    .filter((time) => dailyPushTimePattern.test(time));
}

export function shouldRunDailyPushMessage(content: string, currentKstTime: string) {
  return parseDailyPushMessageTimes(content).includes(currentKstTime);
}

export function formatKstDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatKstTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
