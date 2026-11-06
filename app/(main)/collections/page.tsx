import { FolderHeart, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CollectionForm } from "@/components/collection-form";
import { Card, PageHeader } from "@/components/ui";
import { createCollection } from "@/lib/actions/wishes";
import { requireViewer } from "@/lib/auth";
import { OCCASIONS, labelFor } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Collection } from "@/lib/types";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("collections")
    .select("*")
    .eq("owner_id", viewer.id)
    .order("created_at", { ascending: false });
  const collections = (data ?? []) as Collection[];

  return (
    <>
      <PageHeader title="Collections" subtitle="Group wishes for a birthday, wedding or any occasion." />

      {collections.length > 0 && (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.id}`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 hover:bg-sand"
            >
              <FolderHeart className="size-6 shrink-0 text-vermilion" strokeWidth={1.5} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{collection.name}</span>
                <span className="block text-sm text-muted">{labelFor(OCCASIONS, collection.occasion)}</span>
              </span>
              {!collection.is_public && <Lock className="size-4 text-muted" aria-label="Private" />}
            </Link>
          ))}
        </div>
      )}

      <Card className="max-w-xl p-5">
        <h2 className="mb-4 text-xl font-semibold">New collection</h2>
        <CollectionForm action={createCollection} />
      </Card>
    </>
  );
}
