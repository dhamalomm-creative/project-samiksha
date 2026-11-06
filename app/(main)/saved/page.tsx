import type { Metadata } from "next";
import { WishGrid } from "@/components/wish-card";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { WISH_WITH_OWNER, hydrateWishes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data } = await supabase
    .from("saves")
    .select(`wish:wishes(${WISH_WITH_OWNER})`)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = ((data ?? []) as unknown as { wish: never }[]).map((row) => row.wish).filter(Boolean);
  const wishes = await hydrateWishes(supabase, rows, viewer.id);

  return (
    <>
      <PageHeader title="Saved" subtitle="Gift ideas you want to come back to." />
      {wishes.length > 0 ? (
        <WishGrid wishes={wishes} viewerId={viewer.id} />
      ) : (
        <EmptyState title="Nothing saved yet" action={<LinkButton href="/discover">Browse ideas</LinkButton>}>
          Tap the bookmark on any wish to keep it here.
        </EmptyState>
      )}
    </>
  );
}
