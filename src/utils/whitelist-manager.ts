import { UserNode } from "../model/user";
import { Timings } from "../model/timings";
import {
  WHITELISTED_RESULTS_STORAGE_KEY,
  TIMINGS_STORAGE_KEY,
  PAGE_SIZE_STORAGE_KEY,
  MAX_UNFOLLOWS_PER_RUN_STORAGE_KEY,
  UNFOLLOWERS_PER_PAGE,
  MIN_PAGE_SIZE,
  MAX_PAGE_SIZE,
  DEFAULT_MAX_UNFOLLOWS_PER_RUN,
  MIN_UNFOLLOWS_PER_RUN,
  MAX_UNFOLLOWS_PER_RUN,
} from "../constants/constants";

/**
 * Export whitelist to a JSON file
 */
export const exportWhitelist = (whitelistedUsers: readonly UserNode[]): void => {
  if (whitelistedUsers.length === 0) {
    alert("No users in whitelist to export");
    return;
  }

  const dataStr = JSON.stringify(whitelistedUsers, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `instagram-whitelist-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Import whitelist from a JSON file
 */
export const importWhitelist = (
  file: File,
  onSuccess: (users: readonly UserNode[]) => void,
  onError: (message: string) => void
): void => {
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      const importedUsers = JSON.parse(content) as UserNode[];
      
      // Validate the imported data
      if (!Array.isArray(importedUsers)) {
        onError("Invalid file format: Expected an array of users");
        return;
      }
      
      // Basic validation of user structure
      const isValid = importedUsers.every(user => 
        user.id && 
        user.username && 
        typeof user.id === "string" && 
        typeof user.username === "string"
        && (user.id.startsWith("manual:") || /^\d+$/.test(user.id))
      );
      
      if (!isValid) {
        onError("Invalid file format: Users missing required fields (id, username)");
        return;
      }
      
      onSuccess(importedUsers);
    } catch (error) {
      onError(`Failed to parse JSON file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  reader.onerror = () => {
    onError("Failed to read file");
  };
  
  reader.readAsText(file);
};

/**
 * Clear all whitelist data
 */
export const clearWhitelist = (): void => {
  if (!confirm("Are you sure you want to clear the entire whitelist? This action cannot be undone.")) {
    return;
  }
  
  localStorage.removeItem(WHITELISTED_RESULTS_STORAGE_KEY);
};

/**
 * Load whitelist from localStorage
 */
export const loadWhitelist = (): readonly UserNode[] => {
  const whitelistedResultsFromStorage = localStorage.getItem(WHITELISTED_RESULTS_STORAGE_KEY);
  return whitelistedResultsFromStorage === null ? [] : JSON.parse(whitelistedResultsFromStorage);
};

/**
 * Save whitelist to localStorage
 */
export const saveWhitelist = (whitelistedUsers: readonly UserNode[]): void => {
  localStorage.setItem(WHITELISTED_RESULTS_STORAGE_KEY, JSON.stringify(whitelistedUsers));
};

/**
 * Merge imported whitelist with existing whitelist (avoiding duplicates)
 */
export const mergeWhitelists = (
  existing: readonly UserNode[],
  imported: readonly UserNode[]
): readonly UserNode[] => {
  const existingIds = new Set(existing.map(user => user.id));
  const existingUsernames = new Set(
    existing.map(user => user.username.toLowerCase())
  );
  const uniqueImported = imported.filter(user =>
    !existingIds.has(user.id)
    && !existingUsernames.has(user.username.toLowerCase())
  );
  return [...existing, ...uniqueImported];
};

const isTimings = (value: unknown): value is Timings => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((timing) => typeof timing === "number");
};

/**
 * Load timings from localStorage
 */
export const loadTimings = (): Timings | null => {
  const timingsFromStorage = localStorage.getItem(TIMINGS_STORAGE_KEY);

  if (timingsFromStorage === null) {
    return null;
  }

  try {
    const parsedTimings: unknown = JSON.parse(timingsFromStorage);
    return isTimings(parsedTimings) ? parsedTimings : null;
  } catch {
    return null;
  }
};

/**
 * Save timings to localStorage
 */
export const saveTimings = (timings: Timings): void => {
  localStorage.setItem(TIMINGS_STORAGE_KEY, JSON.stringify(timings));
};

const clampWholeNumber = (value: number, min: number, max: number, fallback: number): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(Math.round(value), min), max);
};

const loadClampedNumber = (key: string, min: number, max: number, fallback: number): number => {
  const stored = localStorage.getItem(key);
  if (stored === null) {
    return fallback;
  }
  return clampWholeNumber(Number(stored), min, max, fallback);
};

/**
 * Keep a page size within the range the pagination can actually render.
 */
export const clampPageSize = (pageSize: number): number =>
  clampWholeNumber(pageSize, MIN_PAGE_SIZE, MAX_PAGE_SIZE, UNFOLLOWERS_PER_PAGE);

export const loadPageSize = (): number =>
  loadClampedNumber(PAGE_SIZE_STORAGE_KEY, MIN_PAGE_SIZE, MAX_PAGE_SIZE, UNFOLLOWERS_PER_PAGE);

export const savePageSize = (pageSize: number): void => {
  localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(clampPageSize(pageSize)));
};

/**
 * Keep the per run unfollow cap inside the range that is safe to send to Instagram.
 */
export const clampMaxUnfollowsPerRun = (maxUnfollows: number): number =>
  clampWholeNumber(maxUnfollows, MIN_UNFOLLOWS_PER_RUN, MAX_UNFOLLOWS_PER_RUN, DEFAULT_MAX_UNFOLLOWS_PER_RUN);

export const loadMaxUnfollowsPerRun = (): number =>
  loadClampedNumber(
    MAX_UNFOLLOWS_PER_RUN_STORAGE_KEY,
    MIN_UNFOLLOWS_PER_RUN,
    MAX_UNFOLLOWS_PER_RUN,
    DEFAULT_MAX_UNFOLLOWS_PER_RUN,
  );

export const saveMaxUnfollowsPerRun = (maxUnfollows: number): void => {
  localStorage.setItem(MAX_UNFOLLOWS_PER_RUN_STORAGE_KEY, String(clampMaxUnfollowsPerRun(maxUnfollows)));
};
