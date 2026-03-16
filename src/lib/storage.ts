import { SavedMap, ExcalidrawScene } from "./types";

const STORAGE_KEY = "grokessmap_history";
const MAX_ENTRIES = 50;

export function getSavedMaps(): SavedMap[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const maps: SavedMap[] = JSON.parse(raw);
    // Sort by most recently updated
    return maps.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [];
  }
}

export function getSavedMap(id: string): SavedMap | null {
  const maps = getSavedMaps();
  return maps.find((m) => m.id === id) || null;
}

export function saveMap(map: SavedMap): void {
  const maps = getSavedMaps();
  const existingIndex = maps.findIndex((m) => m.id === map.id);

  if (existingIndex >= 0) {
    maps[existingIndex] = { ...map, updatedAt: new Date().toISOString() };
  } else {
    maps.unshift({ ...map, updatedAt: new Date().toISOString() });
  }

  // Enforce max entries
  const trimmed = maps.slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function updateMapExcalidraw(
  id: string,
  excalidrawData: ExcalidrawScene
): void {
  const maps = getSavedMaps();
  const idx = maps.findIndex((m) => m.id === id);
  if (idx >= 0) {
    maps[idx].excalidrawData = excalidrawData;
    maps[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  }
}

export function updateMapTitle(id: string, title: string): void {
  const maps = getSavedMaps();
  const idx = maps.findIndex((m) => m.id === id);
  if (idx >= 0) {
    maps[idx].title = title;
    maps[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
  }
}

export function deleteMap(id: string): void {
  const maps = getSavedMaps();
  const filtered = maps.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function getStorageUsage(): { used: number; max: number; percent: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "";
    const used = new Blob([raw]).size;
    const max = 5 * 1024 * 1024; // ~5MB reasonable limit
    return { used, max, percent: Math.round((used / max) * 100) };
  } catch {
    return { used: 0, max: 5 * 1024 * 1024, percent: 0 };
  }
}