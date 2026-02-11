export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;
  const absDiff = Math.abs(diff);

  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);

  if (diff > 0) {
    if (days > 0) return `in ${days}d`;
    if (hours > 0) return `in ${hours}h`;
    if (minutes > 0) return `in ${minutes}m`;
    return "soon";
  } else {
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  }
}
