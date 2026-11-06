import { Gift, Lock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { displayName, formatPrice } from "@/lib/format";
import type { WishView } from "@/lib/types";
import { Avatar } from "./ui";
import { LikeButton, SaveButton } from "./wish-actions";

function Status({ wish, isOwner }: { wish: WishView; isOwner: boolean }) {
  const pill = "absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold";
  if (wish.received) return <span className={`${pill} bg-leaf text-white`}>Received</span>;
  if (isOwner && wish.visibility === "private") {
    return (
      <span className={`${pill} bg-ink/80 text-white`}>
        <Lock className="size-3" aria-hidden />
        Private
      </span>
    );
  }
  if (wish.reservation?.mine) return <span className={`${pill} bg-leaf text-white`}>Your gift</span>;
  if (wish.reservation) return <span className={`${pill} bg-marigold text-ink`}>Reserved</span>;
  return null;
}

export function WishCard({
  wish,
  viewerId,
  showOwner = true,
}: {
  wish: WishView;
  viewerId: string | null;
  showOwner?: boolean;
}) {
  const isOwner = wish.owner_id === viewerId;
  const price = formatPrice(wish.price_inr);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card">
      <Link href={`/wish/${wish.id}`} className="relative block aspect-square overflow-hidden bg-sand">
        {wish.image_url ? (
          <img
            src={wish.image_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid size-full place-items-center text-muted/40">
            <Gift className="size-12" strokeWidth={1.25} aria-hidden />
          </span>
        )}
        <Status wish={wish} isOwner={isOwner} />
      </Link>

      <div className="flex flex-1 flex-col p-3.5">
        <Link href={`/wish/${wish.id}`} className="line-clamp-2 font-semibold leading-snug hover:text-vermilion">
          {wish.title}
        </Link>
        {price && <p className="mt-1 font-display text-lg font-semibold">{price}</p>}

        {showOwner && (
          <Link
            href={`/u/${wish.owner.username}`}
            className="mt-2.5 flex min-w-0 items-center gap-2 text-sm text-muted hover:text-ink"
          >
            <Avatar person={wish.owner} size="sm" />
            <span className="truncate">{displayName(wish.owner)}</span>
          </Link>
        )}

        <div className="-mx-2 mt-auto flex items-center pt-1.5">
          <LikeButton wishId={wish.id} liked={wish.liked} count={wish.like_count} signedIn={!!viewerId} />
          <Link
            href={`/wish/${wish.id}#comments`}
            aria-label={`${wish.comment_count} comments`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted hover:text-ink"
          >
            <MessageCircle className="size-5" aria-hidden />
            {wish.comment_count > 0 && wish.comment_count}
          </Link>
          <span className="ml-auto">
            <SaveButton wishId={wish.id} saved={wish.saved} signedIn={!!viewerId} />
          </span>
        </div>
      </div>
    </article>
  );
}

export function WishGrid({
  wishes,
  viewerId,
  showOwner,
}: {
  wishes: WishView[];
  viewerId: string | null;
  showOwner?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {wishes.map((wish) => (
        <WishCard key={wish.id} wish={wish} viewerId={viewerId} showOwner={showOwner} />
      ))}
    </div>
  );
}
