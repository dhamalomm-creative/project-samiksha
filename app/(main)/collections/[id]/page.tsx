import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CollectionForm } from "@/components/collection-form";
import { ConfirmForm } from "@/components/confirm-form";
import { ShareButton } from "@/components/wish-actions";
import { WishGrid } from "@/components/wish-card";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { deleteCollection, updateCollection } from "@/lib/actions/wishes";
import { getViewer } from "@/lib/auth";
import { OCCASIONS, labelFor } from "@/lib/constants";
import { displayName } from "@/lib/format";
import { OWNER_FIELDS, WISH_WITH_OWNER, hydrateWishes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Collection, Owner } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getCollection = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select(`*, owner:profiles!collections_owner_id_fkey(${OWNER_FIELDS})`)
    .eq("id", id)
    .maybeSingle();
  return data as (Collection & { owner: Owner }) | null;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const collection = await getCollection((await params).id);
  if (!collection) return { title: "Collection not found" };
  return {
    title: `${collection.name} · ${displayName(collection.owner)}`,
    description: `${displayName(collection.owner)}'s ${labelFor(OCCASIONS, collection.occasion).toLowerCase()} wishlist on Samiksha.`,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await getCollection(id);
  if (!collection) notFound();

  const viewer = await getViewer();
  const viewerId = viewer?.id ?? null;
  const isOwner = viewerId === collection.owner_id;
  const supabase = await createClient();

  const { data } = await supabase
    .from("wishes")
    .select(WISH_WITH_OWNER)
    .eq("collection_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  const wishes = await hydrateWishes(supabase, (data ?? []) as never, viewerId);

  const date = collection.event_date
    ? new Date(`${collection.event_date}T00:00:00Z`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  return (
    <>
      <PageHeader
        title={collection.name}
        subtitle={[labelFor(OCCASIONS, collection.occasion), date].filter(Boolean).join(" · ")}
        action={<ShareButton path={`/collections/${id}`} text={collection.name} />}
      />
      {!isOwner && (
        <p className="-mt-3 mb-5 text-muted">
          By{" "}
          <Link href={`/u/${collection.owner.username}`} className="font-semibold text-ink underline">
            {displayName(collection.owner)}
          </Link>
        </p>
      )}

      {wishes.length > 0 ? (
        <WishGrid wishes={wishes} viewerId={viewerId} showOwner={false} />
      ) : (
        <EmptyState
          title="No wishes here yet"
          action={isOwner ? <LinkButton href={`/wish/new?collection=${id}`}>Add a wish</LinkButton> : undefined}
        />
      )}

      {isOwner && (
        <>
          {wishes.length > 0 && (
            <div className="mt-5">
              <LinkButton href={`/wish/new?collection=${id}`} variant="secondary">Add a wish</LinkButton>
            </div>
          )}
          <Card className="mt-8 max-w-xl space-y-5 p-5">
            <h2 className="text-xl font-semibold">Collection settings</h2>
            <CollectionForm action={updateCollection.bind(null, id)} collection={collection} />
            <div className="border-t border-line pt-5">
              <ConfirmForm
                action={deleteCollection.bind(null, id)}
                message="Delete this collection? The wishes inside stay on your wishlist."
                label="Delete collection"
              />
            </div>
          </Card>
        </>
      )}
    </>
  );
}
