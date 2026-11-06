import { Bookmark, CalendarHeart, ChevronRight, FolderHeart, Settings, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const { profile } = await requireViewer();

  const links = [
    { href: `/u/${profile.username}`, label: "My public profile", icon: UserRound },
    { href: "/collections", label: "Collections", icon: FolderHeart },
    { href: "/occasions", label: "Occasions", icon: CalendarHeart },
    { href: "/saved", label: "Saved", icon: Bookmark },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      <PageHeader title="Menu" />
      <Card className="divide-y divide-line">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-14 items-center gap-3 px-4 font-medium hover:bg-sand">
            <Icon className="size-5 text-muted" aria-hidden />
            {label}
            <ChevronRight className="ml-auto size-4 text-muted" aria-hidden />
          </Link>
        ))}
      </Card>
    </>
  );
}
