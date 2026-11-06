import type { Metadata } from "next";
import Link from "next/link";
import { FollowButton } from "@/components/wish-actions";
import { WishGrid } from "@/components/wish-card";
import { Avatar, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { PAGE_SIZE } from "@/lib/constants";
import { displayName } from "@/lib/format";
import { OWNER_FIELDS, hydrateWishes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Owner, Wish } from "@/lib/types";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const viewer = await requireViewer();
  const { before } = await searchParams;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .rpc("home_feed", {
      before_ts: before && !Number.isNaN(Date.parse(before)) ? before : null,
      page_size: PAGE_SIZE,
    })
    .select(`*, owner:profiles!wishes_owner_id_fkey(${OWNER_FIELDS})`);

  const wishes = await hydrateWishes(supabase, (rows ?? []) as (Wish & { owner: Owner })[], viewer.id);
  const older = wishes.length === PAGE_SIZE ? wishes[wishes.length - 1].created_at : null;

  let suggestions: Owner[] = [];
  if (wishes.length === 0 && !before) {
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewer.id);
    const excluded = [viewer.id, ...(following ?? []).map((row) => row.following_id)];
    const { data } = await supabase
      .from("profiles")
      .select(OWNER_FIELDS)
      .eq("onboarded", true)
      .not("id", "in", `(${excluded.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(6);
    suggestions = (data ?? []) as Owner[];
  }

  return (
    <>
      <PageHeader title="Home" subtitle="New wishes from people you follow." />

      {wishes.length > 0 ? (
        <>
          <WishGrid wishes={wishes} viewerId={viewer.id} />
          {older && (
            <div className="mt-8 text-center">
              <LinkButton variant="secondary" href={`/home?before=${encodeURIComponent(older)}`}>
                Show older wishes
              </LinkButton>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title={before ? "That's everything" : "Your feed is waiting for friends"}
          action={<LinkButton href="/discover">Find people to follow</LinkButton>}
        >
          {!before && "Follow friends and family to see what they're wishing for."}
        </EmptyState>
      )}

      {suggestions.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">People on Samiksha</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((person) => (
              <Card key={person.id} className="flex items-center gap-3 p-3">
                <Link href={`/u/${person.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar person={person} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{displayName(person)}</span>
                    <span className="block truncate text-sm text-muted">@{person.username}</span>
                  </span>
                </Link>
                <FollowButton profileId={person.id} following={false} signedIn />
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
