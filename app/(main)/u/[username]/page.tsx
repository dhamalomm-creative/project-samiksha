import { FolderHeart, Globe, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FollowButton, ReportButton, ShareButton } from "@/components/wish-actions";
import { WishGrid } from "@/components/wish-card";
import { Avatar, Card, EmptyState, LinkButton } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { OCCASIONS, labelFor } from "@/lib/constants";
import { displayName } from "@/lib/format";
import { WISH_WITH_OWNER, hydrateWishes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Collection, Profile } from "@/lib/types";

const PUBLIC_FIELDS = "id, username, full_name, avatar_url, bio, location, website, onboarded, created_at";

const getProfile = cache(async (username: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PUBLIC_FIELDS)
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return data as Profile | null;
});

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const profile = await getProfile((await params).username);
  if (!profile) return { title: "Profile not found" };
  const title = `${displayName(profile)}'s wishlist`;
  return {
    title,
    description: profile.bio || `See what ${displayName(profile)} is wishing for on Samiksha.`,
    openGraph: { title, images: profile.avatar_url ? [profile.avatar_url] : undefined },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const profile = await getProfile((await params).username);
  if (!profile) notFound();

  const viewer = await getViewer();
  const viewerId = viewer?.id ?? null;
  const isSelf = viewerId === profile.id;
  const supabase = await createClient();

  const [wishRows, collections, followers, following, amFollowing] = await Promise.all([
    supabase
      .from("wishes")
      .select(WISH_WITH_OWNER)
      .eq("owner_id", profile.id)
      .eq("visibility", "public")
      .order("received")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("collections")
      .select("*")
      .eq("owner_id", profile.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    viewerId && !isSelf
      ? supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", viewerId)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const wishes = await hydrateWishes(supabase, (wishRows.data ?? []) as never, viewerId);
  const stats = [
    { label: "wishes", value: wishes.length },
    { label: "followers", value: followers.count ?? 0 },
    { label: "following", value: following.count ?? 0 },
  ];

  return (
    <>
      <Card className="mb-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4 sm:gap-5">
          <Avatar person={profile} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-semibold sm:text-3xl">{displayName(profile)}</h1>
            <p className="text-muted">@{profile.username}</p>
            <p className="mt-2 flex gap-4 text-sm">
              {stats.map((stat) => (
                <span key={stat.label}>
                  <strong>{stat.value}</strong> <span className="text-muted">{stat.label}</span>
                </span>
              ))}
            </p>
          </div>
        </div>

        {profile.bio && <p className="mt-4 whitespace-pre-wrap break-words">{profile.bio}</p>}

        {(profile.location || profile.website) && (
          <p className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden />
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 hover:text-ink"
              >
                <Globe className="size-4" aria-hidden />
                Website
              </a>
            )}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isSelf ? (
            <LinkButton href="/settings" variant="secondary">Edit profile</LinkButton>
          ) : (
            <FollowButton profileId={profile.id} following={!!amFollowing.data} signedIn={!!viewerId} />
          )}
          <ShareButton path={`/u/${profile.username}`} text={`${displayName(profile)}'s wishlist on Samiksha`} />
          {viewerId && !isSelf && <ReportButton targetType="profile" targetId={profile.id} />}
        </div>
      </Card>

      {(collections.data?.length ?? 0) > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xl font-semibold">Collections</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(collections.data as Collection[]).map((collection) => (
              <Link
                key={collection.id}
                href={`/collections/${collection.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 hover:bg-sand"
              >
                <FolderHeart className="size-6 shrink-0 text-vermilion" strokeWidth={1.5} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{collection.name}</span>
                  <span className="block text-sm text-muted">{labelFor(OCCASIONS, collection.occasion)}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <h2 className="mb-3 text-xl font-semibold">Wishlist</h2>
      {wishes.length > 0 ? (
        <WishGrid wishes={wishes} viewerId={viewerId} showOwner={false} />
      ) : (
        <EmptyState title={isSelf ? "Your public list is empty" : "No wishes yet"} />
      )}
    </>
  );
}
