export const managerBrowserSessionStorageKey = "ollbareun.manager.browserSession";

export function markManagerBrowserSessionActive() {
  try {
    window.sessionStorage.setItem(managerBrowserSessionStorageKey, "active");
  } catch {
    // Login should continue even when browser storage is unavailable.
  }
}

export function hasActiveManagerBrowserSession() {
  try {
    return window.sessionStorage.getItem(managerBrowserSessionStorageKey) === "active";
  } catch {
    return false;
  }
}

export function hasPersistedSupabaseAuthCookie() {
  return document.cookie.split(";").some((cookie) => {
    const name = cookie.trim().split("=", 1)[0];
    return name.startsWith("sb-") && name.includes("auth-token");
  });
}
