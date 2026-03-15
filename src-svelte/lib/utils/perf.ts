export function capArray<T>(items: T[], limit: number): T[] {
  if (!Number.isFinite(limit) || limit <= 0) {
    return [];
  }
  return items.length <= limit ? items : items.slice(0, limit);
}
