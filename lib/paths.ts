/** Only ever redirect within this site, so a crafted ?next= can't send users elsewhere. */
export function safeNext(next: string | null | undefined, fallback = "/home") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}

export function siteUrl(requestOrigin?: string | null) {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin ?? "http://localhost:3000").replace(/\/$/, "");
}
