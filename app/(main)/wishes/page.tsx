import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { ShareButton } from "@/components/wish-actions";
import { WishGrid } from "@/components/wish-card";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { WISH_WITH_OWNER, hydrateWishes } from "@/lib/queries";
import { siteUrl } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "My wishlist" };

const FILTERS = [
  { value: "open", label: "Wishing for" },
  { value: "received", label: "Received" },
  { value: "private", label: "Private" },
];

export default async function MyWishesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const viewer = await requireViewer();
  const { filter = "open" } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("wishes")
    .select(WISH_WITH_OWNER)
    .eq("owner_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const all = await hydrateWishes(supabase, (data ?? []) as never, viewer.id);
  const open = all.filter((wish) => !wish.received);
  const received = all.filter((wish) => wish.received);
  const shown =
    filter === "received" ? received
    : filter === "private" ? all.filter((wish) => wish.visibility === "private")
    : open;
  const totalValue = open.reduce((sum, wish) => sum + (wish.price_inr ?? 0), 0);

  const origin = (await headers()).get("origin");
  const profilePath = `/u/${viewer.profile.username}`;
  const shareUrl = `${siteUrl(origin)}${profilePath}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Here's my wishlist on Samiksha: ${shareUrl}`)}`;

  const stats = [
    { label: "Wishing for", value: open.length },
    { label: "Received", value: received.length },
    { label: "Total value", value: formatPrice(totalValue) },
  ];

  return (
    <>
      <PageHeader title="My wishlist" />

      {all.length === 0 ? (
        <EmptyState
          title="What would make you smile?"
          action={<LinkButton href="/wish/new">Add your first wish</LinkButton>}
        >
          Add something you&apos;d love to receive, then share your list with friends and family.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <Card key={stat.label} className="p-3 sm:p-4">
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="mt-0.5 truncate font-display text-xl font-semibold sm:text-2xl">{stat.value}</p>
              </Card>
            ))}
          </div>

          <Card className="mt-3 flex flex-wrap items-center justify-between gap-3 bg-marigold-soft p-4">
            <div>
              <p className="font-semibold">Your list is ready to share</p>
              <p className="text-sm text-muted">Reservations stay hidden from you, so surprises survive.</p>
            </div>
            <div className="flex gap-2">
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-leaf px-4 text-sm font-semibold text-white">
                WhatsApp
              </a>
              <ShareButton path={profilePath} text="Here's my wishlist on Samiksha" />
            </div>
          </Card>

          <div className="my-5 flex gap-4 text-sm font-semibold">
            {FILTERS.map((item) => (
              <Link
                key={item.value}
                href={`/wishes?filter=${item.value}`}
                className={clsx(filter === item.value ? "text-vermilion" : "text-muted hover:text-ink")}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {shown.length > 0 ? (
            <WishGrid wishes={shown} viewerId={viewer.id} showOwner={false} />
          ) : (
            <EmptyState title="Nothing in this view" />
          )}
        </>
      )}
    </>
  );
}
