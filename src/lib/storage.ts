export function readJsonFromStorage<T>(key: string): T | null {
  const storage = getLocalStorage();

  if (storage === null) {
    return null;
  }

  try {
    const rawValue = storage.getItem(key);

    return rawValue === null ? null : (JSON.parse(rawValue) as T);
  } catch {
    return null;
  }
}

export function writeJsonToStorage(key: string, value: unknown): boolean {
  const storage = getLocalStorage();

  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(key, JSON.stringify(value));

    return true;
  } catch {
    return false;
  }
}

export function removeFromStorage(key: string): boolean {
  const storage = getLocalStorage();

  if (storage === null) {
    return false;
  }

  try {
    storage.removeItem(key);

    return true;
  } catch {
    return false;
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
