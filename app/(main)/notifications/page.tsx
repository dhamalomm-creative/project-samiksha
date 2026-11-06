import { Gift } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { Avatar, Button, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { markAllRead } from "@/lib/actions/social";
import { requireViewer } from "@/lib/auth";
import { displayName, timeAgo } from "@/lib/format";
import { OWNER_FIELDS } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";

export const metadata: Metadata = { title: "Notifications" };

function describe(item: Notification) {
  const name = item.actor ? displayName(item.actor) : "Someone";
  switch (item.type) {
    case "follow":
      return `${name} started following you`;
    case "like":
      return `${name} liked your wish`;
    case "comment":
      return `${name} commented: ${item.body}`;
    default:
      return item.body;
  }
}

function target(item: Notification) {
  if (item.wish_id) return `/wish/${item.wish_id}`;
  if (item.actor) return `/u/${item.actor.username}`;
  return "/gifts";
}

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select(`*, actor:profiles!notifications_actor_id_fkey(${OWNER_FIELDS})`)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const items = (data ?? []) as Notification[];
  const hasUnread = items.some((item) => !item.read_at);

  return (
    <>
      <PageHeader
        title="Notifications"
        action={
          hasUnread ? (
            <form action={markAllRead}>
              <Button variant="secondary" type="submit">Mark all read</Button>
            </form>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState title="All quiet" action={<LinkButton href="/wishes">Share your wishlist</LinkButton>}>
          Likes, comments and new followers will show up here.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={target(item)}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl border p-3.5 transition hover:bg-sand",
                  item.read_at ? "border-line bg-card" : "border-marigold bg-marigold-soft/60",
                )}
              >
                {item.actor ? (
                  <Avatar person={item.actor} />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-leaf-soft text-leaf">
                    <Gift className="size-5" aria-hidden />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 break-words">{describe(item)}</span>
                  <span className="text-sm text-muted">{timeAgo(item.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
