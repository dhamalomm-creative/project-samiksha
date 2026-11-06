"use client";

import { Bell, Bookmark, CalendarHeart, Compass, FolderHeart, Gift, Home, Plus, Search, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import { displayName } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { Avatar, LinkButton, Logo } from "./ui";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/wishes", label: "My wishlist", icon: Sparkles },
  { href: "/collections", label: "Collections", icon: FolderHeart },
  { href: "/gifts", label: "Gifts I'm giving", icon: Gift },
  { href: "/occasions", label: "Occasions", icon: CalendarHeart },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/wish/new", label: "Add wish", icon: Plus },
  { href: "/gifts", label: "Gifts", icon: Gift },
  { href: "/wishes", label: "Wishlist", icon: Sparkles },
];

function SearchBox({ className }: { className?: string }) {
  return (
    <form action="/search" role="search" className={clsx("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        name="q"
        type="search"
        aria-label="Search people and wishes"
        placeholder="Search people and wishes"
        className="h-11 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-base outline-none focus:border-vermilion"
      />
    </form>
  );
}

export function AppShell({
  profile,
  unread,
  children,
}: {
  profile: Profile | null;
  unread: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (!profile) {
    return (
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
            <Logo />
            <Link href="/discover" className="hidden text-sm font-medium text-muted hover:text-ink sm:block">
              Discover
            </Link>
            <div className="ml-auto flex gap-2">
              <LinkButton href="/login" variant="ghost">Log in</LinkButton>
              <LinkButton href="/signup">Sign up</LinkButton>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-card/50 px-3 py-5 lg:flex">
        <Logo className="px-3" />
        <nav aria-label="Main" className="mt-6 flex-1 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={clsx(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition",
                isActive(href) ? "bg-ink text-paper" : "text-muted hover:bg-sand hover:text-ink",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
              {href === "/notifications" && unread > 0 && (
                <span className="ml-auto rounded-full bg-vermilion px-2 py-0.5 text-xs font-semibold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <Link
          href={`/u/${profile.username}`}
          className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-sand"
        >
          <Avatar person={profile} />
          <span className="min-w-0">
            <span className="block truncate font-semibold">{displayName(profile)}</span>
            <span className="block truncate text-sm text-muted">@{profile.username}</span>
          </span>
        </Link>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Logo className="lg:hidden" />
          <SearchBox className="hidden flex-1 sm:block sm:max-w-md" />
          <div className="ml-auto flex items-center gap-1">
            <Link href="/search" aria-label="Search" className="grid size-11 place-items-center rounded-xl text-muted sm:hidden">
              <Search className="size-5" aria-hidden />
            </Link>
            <Link
              href="/notifications"
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              className="relative grid size-11 place-items-center rounded-xl text-muted hover:bg-sand lg:hidden"
            >
              <Bell className="size-5" aria-hidden />
              {unread > 0 && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full bg-vermilion" />}
            </Link>
            <Link href="/menu" aria-label="Menu" className="ml-1 lg:hidden">
              <Avatar person={profile} size="sm" />
            </Link>
            <span className="hidden lg:block">
              <LinkButton href="/wish/new">
                <Plus className="size-4" aria-hidden />
                Add wish
              </LinkButton>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 lg:pb-10">{children}</main>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={clsx(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              isActive(href) ? "text-vermilion" : "text-muted",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
