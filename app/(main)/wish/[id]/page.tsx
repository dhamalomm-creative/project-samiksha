import { ExternalLink, Gift, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Comments } from "@/components/comments";
import { Avatar, Card, LinkButton, buttonClass } from "@/components/ui";
import {
  LikeButton,
  ReceivedToggle,
  ReportButton,
  ReservePanel,
  SaveButton,
  ShareButton,
} from "@/components/wish-actions";
import { getViewer } from "@/lib/auth";
import { CATEGORIES, PRIORITIES, labelFor } from "@/lib/constants";
import { displayName, formatPrice, timeAgo } from "@/lib/format";
import { OWNER_FIELDS, WISH_WITH_OWNER, hydrateWishes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Comment, Owner, Wish } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getWish = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("wishes").select(WISH_WITH_OWNER).eq("id", id).maybeSingle();
  return data as (Wish & { owner: Owner }) | null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const wish = await getWish((await params).id);
  if (!wish) return { title: "Wish not found" };
  const title = `${wish.title}, on ${displayName(wish.owner)}'s wishlist`;
  return {
    title,
    description: wish.description || "See this wish on Samiksha.",
    openGraph: { title, images: wish.image_url ? [wish.image_url] : undefined },
    robots: wish.visibility === "private" ? { index: false } : undefined,
  };
}

export default async function WishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getWish(id);
  if (!row) notFound();

  const viewer = await getViewer();
  const viewerId = viewer?.id ?? null;
  const supabase = await createClient();

  const [[wish], { data: comments }] = await Promise.all([
    hydrateWishes(supabase, [row], viewerId),
    supabase
      .from("comments")
      .select(`*, author:profiles!comments_user_id_fkey(${OWNER_FIELDS})`)
      .eq("wish_id", id)
      .order("created_at")
      .limit(200),
  ]);

  const isOwner = viewerId === wish.owner_id;
  const price = formatPrice(wish.price_inr);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="aspect-square overflow-hidden rounded-2xl bg-sand lg:sticky lg:top-24 lg:self-start">
        {wish.image_url ? (
          <img src={wish.image_url} alt={wish.title} className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-muted/40">
            <Gift className="size-20" strokeWidth={1} aria-hidden />
          </span>
        )}
      </div>

      <div className="min-w-0 space-y-6">
        <div>
          <p className="text-sm font-medium text-muted">
            {labelFor(CATEGORIES, wish.category)} · {labelFor(PRIORITIES, wish.priority)}
            {wish.visibility === "private" && " · Only you can see this"}
          </p>
          <h1 className="mt-1 break-words text-3xl font-semibold sm:text-4xl">{wish.title}</h1>
          {price && <p className="mt-2 font-display text-3xl font-semibold">{price}</p>}
          <Link href={`/u/${wish.owner.username}`} className="mt-4 flex items-center gap-3 hover:opacity-80">
            <Avatar person={wish.owner} />
            <span>
              <span className="block font-semibold">{displayName(wish.owner)}</span>
              <span className="block text-sm text-muted">wished {timeAgo(wish.created_at)}</span>
            </span>
          </Link>
          {wish.description && <p className="mt-4 whitespace-pre-wrap break-words">{wish.description}</p>}
        </div>

        <Card className="space-y-3 p-4">
          {isOwner ? (
            <>
              <p className="text-sm text-muted">
                Reservations are hidden from you, so you won&apos;t know who&apos;s gifting what. Enjoy the surprise.
              </p>
              <div className="flex flex-wrap gap-2">
                <ReceivedToggle wishId={wish.id} received={wish.received} />
                <LinkButton href={`/wish/${wish.id}/edit`} variant="secondary">
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </LinkButton>
              </div>
            </>
          ) : wish.visibility === "public" ? (
            <ReservePanel
              wishId={wish.id}
              reservation={wish.reservation}
              received={wish.received}
              signedIn={!!viewerId}
            />
          ) : null}

          {wish.product_url && (
            <a
              href={wish.product_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className={buttonClass("secondary", "w-full sm:w-auto")}
            >
              <ExternalLink className="size-4" aria-hidden />
              View in store
            </a>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          <LikeButton wishId={wish.id} liked={wish.liked} count={wish.like_count} signedIn={!!viewerId} />
          <SaveButton wishId={wish.id} saved={wish.saved} signedIn={!!viewerId} />
          <ShareButton path={`/wish/${wish.id}`} text={wish.title} />
          {viewerId && !isOwner && <ReportButton targetType="wish" targetId={wish.id} />}
        </div>

        <Comments
          wishId={wish.id}
          ownerId={wish.owner_id}
          comments={(comments ?? []) as Comment[]}
          viewerId={viewerId}
        />
      </div>
    </div>
  );
}
