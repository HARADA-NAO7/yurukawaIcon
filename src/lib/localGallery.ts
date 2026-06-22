import { IconRecord } from "./supabase";

const KEY = "yurukawa_gallery";
const MAX_ITEMS = 5;
const MAX_KEYWORD_LENGTH = 24;
type GalleryDraft = Omit<IconRecord, "id" | "created_at">;

type LegacyRecord = Partial<IconRecord> & {
  imageUrl?: string;
  createdAt?: string;
};

function createUuid(): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi) {
    throw new Error("Crypto API is not available");
  }

  if (typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toStableLegacyId(imageUrl: string, createdAt: string, index: number): string {
  const source = `${imageUrl}|${createdAt}|${index}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return `legacy-${hash.toString(36)}`;
}

function coerceRecord(value: unknown, index: number): IconRecord | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as LegacyRecord;
  const imageUrl =
    typeof raw.image_url === "string" && raw.image_url.trim()
      ? raw.image_url.trim()
      : typeof raw.imageUrl === "string" && raw.imageUrl.trim()
        ? raw.imageUrl.trim()
        : "";

  if (!isStorableImageUrl(imageUrl)) return null;

  const createdAt =
    typeof raw.created_at === "string" && raw.created_at.trim()
      ? raw.created_at
      : typeof raw.createdAt === "string" && raw.createdAt.trim()
        ? raw.createdAt
        : new Date(0).toISOString();

  const id =
    typeof raw.id === "string" && raw.id.trim() ? raw.id : toStableLegacyId(imageUrl, createdAt, index);

  return {
    id,
    image_url: imageUrl,
    keyword1: clampKeyword(typeof raw.keyword1 === "string" ? raw.keyword1 : ""),
    keyword2: clampKeyword(typeof raw.keyword2 === "string" ? raw.keyword2 : ""),
    keyword3: clampKeyword(typeof raw.keyword3 === "string" ? raw.keyword3 : ""),
    theme: typeof raw.theme === "string" && raw.theme ? raw.theme : "pastel",
    created_at: createdAt
  };
}

function normalizeGallery(raw: unknown): IconRecord[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.map((item, index) => coerceRecord(item, index)).filter(Boolean) as IconRecord[];
  // Keep persisted array order as-is: newest first, max 5.
  return valid.slice(0, MAX_ITEMS);
}

function clampKeyword(value: string): string {
  return value.trim().slice(0, MAX_KEYWORD_LENGTH);
}

function isStorableImageUrl(value: string): boolean {
  return /^(https?:\/\/|blob:|data:image\/)/i.test(value);
}

function normalizeDraft(record: GalleryDraft): GalleryDraft | null {
  const imageUrl = record.image_url.trim();
  if (!isStorableImageUrl(imageUrl)) {
    return null;
  }

  return {
    image_url: imageUrl,
    keyword1: clampKeyword(record.keyword1),
    keyword2: clampKeyword(record.keyword2),
    keyword3: clampKeyword(record.keyword3),
    theme: record.theme
  };
}

function readPersistedGallerySafe(): IconRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return normalizeGallery(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function tryPersistWithEviction(items: IconRecord[]): IconRecord[] {
  const candidate = items.slice(0, MAX_ITEMS);
  if (typeof window === "undefined") return candidate;

  try {
    localStorage.setItem(KEY, JSON.stringify(candidate));
    return candidate;
  } catch {
    // Never overwrite with smaller/empty arrays on quota failure.
    // Keep last valid persisted state to avoid gallery collapse.
    return readPersistedGallerySafe();
  }
}

export function persistGallery(items: IconRecord[]): IconRecord[] {
  return tryPersistWithEviction(items.slice(0, MAX_ITEMS));
}

export function loadGallery(): IconRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeGallery(parsed);
    // Return normalized data; persistence will be handled by caller (saveToGallery).
    return normalized;
  } catch {
    return [];
  }
}

export function buildNextGallery(prev: IconRecord[], record: GalleryDraft): IconRecord[] {
  const normalizedDraft = normalizeDraft(record);
  const existing = prev.slice(0, MAX_ITEMS);
  if (!normalizedDraft) {
    return existing;
  }
  const next: IconRecord = {
    ...normalizedDraft,
    id: `local-${createUuid()}`,
    created_at: new Date().toISOString()
  };
  // Canonical flow: load array -> prepend new item -> keep latest 5 -> persist.
  return [next, ...existing].slice(0, MAX_ITEMS);
}

export function saveToGallery(record: GalleryDraft): IconRecord[] {
  const existing = loadGallery();
  const updated = buildNextGallery(existing, record);
  return persistGallery(updated);
}
