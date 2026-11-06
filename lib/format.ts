export const formatPrice = (price: number | null | undefined) =>
  price == null ? null : `₹${price.toLocaleString("en-IN")}`;

export const displayName = (person: { full_name: string; username: string }) =>
  person.full_name || `@${person.username}`;

export function timeAgo(iso: string, now = new Date()) {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Today's calendar date in India, as a UTC-midnight Date for simple day maths. */
export function todayInIndia(now = new Date()) {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

const DAY_MS = 86_400_000;

/** Days until the next occurrence of a month/day; 0 means today. */
export function daysUntilAnnual(month: number, day: number, today: Date) {
  const year = today.getUTCFullYear();
  let next = Date.UTC(year, month - 1, day);
  if (next < today.getTime()) next = Date.UTC(year + 1, month - 1, day);
  return Math.round((next - today.getTime()) / DAY_MS);
}

export const daysUntilDate = (iso: string, today: Date) =>
  Math.round((new Date(`${iso}T00:00:00Z`).getTime() - today.getTime()) / DAY_MS);

export function whenLabel(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
