const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function weeklyNext(from = Date.now()): Date {
  return new Date(from + WEEK_MS);
}

export function sameAssessedUrl(candidate: string, completedUrls: string[]): boolean {
  let target: URL;
  try {
    target = new URL(candidate);
  } catch {
    return false;
  }
  if (target.username || target.password) return false;
  if (target.protocol !== "http:" && target.protocol !== "https:") return false;
  return completedUrls.some((stored) => {
    try {
      const url = new URL(stored);
      return url.protocol === target.protocol && url.host === target.host && url.pathname === target.pathname && url.search === target.search;
    } catch {
      return false;
    }
  });
}
