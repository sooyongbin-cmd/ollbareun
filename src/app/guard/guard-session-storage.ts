export const guardSessionStorageKey = "ollbareun.guard.session";

const guardSessionTtlMs = 24 * 60 * 60 * 1000;
const guardSessionChangedEvent = "ollbareun.guard.session.changed";

type StoredGuardSession = {
  employee?: {
    id?: unknown;
  } | null;
  createdAt?: unknown;
  lastActiveAt?: unknown;
  [key: string]: unknown;
};

function getNow() {
  return new Date();
}

function isBrowser() {
  return typeof window !== "undefined";
}

function notifyGuardSessionChanged() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(guardSessionChangedEvent));
}

function getStorageItem(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function removeStorageItem(storage: Storage, key: string) {
  try {
    storage.removeItem(key);
  } catch {
    // Storage may be unavailable in restricted browser modes.
  }
}

function setStorageItem(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function parseStoredSession(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as StoredGuardSession;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function hasEmployeeId(session: StoredGuardSession | null): session is StoredGuardSession & { employee: { id: string } } {
  return typeof session?.employee?.id === "string" && session.employee.id.trim() !== "";
}

function parseTimestamp(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function withSessionTimestamps(session: StoredGuardSession, now: Date) {
  const nowIso = now.toISOString();

  return {
    ...session,
    createdAt: typeof session.createdAt === "string" ? session.createdAt : nowIso,
    lastActiveAt: typeof session.lastActiveAt === "string" ? session.lastActiveAt : nowIso,
  };
}

function isMissingSessionTimestamp(session: StoredGuardSession) {
  return typeof session.createdAt !== "string" || typeof session.lastActiveAt !== "string";
}

function isExpired(session: StoredGuardSession, now: Date) {
  const lastActiveAt = parseTimestamp(session.lastActiveAt);
  if (lastActiveAt === null) {
    return true;
  }

  return now.getTime() - lastActiveAt > guardSessionTtlMs;
}

export function clearStoredGuardSession() {
  if (!isBrowser()) {
    return;
  }

  removeStorageItem(window.localStorage, guardSessionStorageKey);
  removeStorageItem(window.sessionStorage, guardSessionStorageKey);
  notifyGuardSessionChanged();
}

export function readStoredGuardSession<T extends StoredGuardSession = StoredGuardSession>(options: { touch?: boolean } = {}) {
  if (!isBrowser()) {
    return null;
  }

  const now = getNow();
  const localSession = parseStoredSession(getStorageItem(window.localStorage, guardSessionStorageKey));
  const legacySession = localSession
    ? null
    : parseStoredSession(getStorageItem(window.sessionStorage, guardSessionStorageKey));
  const session = localSession ?? legacySession;

  if (!hasEmployeeId(session)) {
    if (session || getStorageItem(window.localStorage, guardSessionStorageKey) || getStorageItem(window.sessionStorage, guardSessionStorageKey)) {
      clearStoredGuardSession();
    }
    return null;
  }

  const needsTimestampPersist = isMissingSessionTimestamp(session);
  const sessionWithTimestamps = withSessionTimestamps(session, now);
  if (isExpired(sessionWithTimestamps, now)) {
    clearStoredGuardSession();
    return null;
  }

  const shouldPersist = Boolean(legacySession) || options.touch || needsTimestampPersist;
  if (shouldPersist) {
    const nextSession = options.touch
      ? { ...sessionWithTimestamps, lastActiveAt: now.toISOString() }
      : sessionWithTimestamps;
    setStorageItem(window.localStorage, guardSessionStorageKey, JSON.stringify(nextSession));
    removeStorageItem(window.sessionStorage, guardSessionStorageKey);
    notifyGuardSessionChanged();
    return nextSession as T;
  }

  return sessionWithTimestamps as T;
}

export function readStoredGuardSessionSnapshot(options: { touch?: boolean } = {}) {
  const session = readStoredGuardSession(options);
  return session ? JSON.stringify(session) : null;
}

export function hasActiveStoredGuardSession(options: { touch?: boolean } = {}) {
  return readStoredGuardSession(options) !== null;
}

export function writeStoredGuardSession<T extends StoredGuardSession>(session: T) {
  if (!isBrowser()) {
    return;
  }

  const nowIso = getNow().toISOString();
  const existing = readStoredGuardSession();
  const nextSession = {
    ...session,
    createdAt: typeof existing?.createdAt === "string" ? existing.createdAt : nowIso,
    lastActiveAt: nowIso,
  };

  setStorageItem(window.localStorage, guardSessionStorageKey, JSON.stringify(nextSession));
  removeStorageItem(window.sessionStorage, guardSessionStorageKey);
  notifyGuardSessionChanged();
}

export function touchStoredGuardSession() {
  return readStoredGuardSession({ touch: true });
}

export function subscribeToGuardSessionChange(onStoreChange: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === guardSessionStorageKey) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(guardSessionChangedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(guardSessionChangedEvent, onStoreChange);
  };
}
