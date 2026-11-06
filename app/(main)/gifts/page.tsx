import type { Metadata } from "next";
import { WishGrid } from "@/components/wish-card";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { WISH_WITH_OWNER, hydrateWishes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gifts I'm giving" };

export default async function GiftsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data } = await supabase
    .from("reservations")
    .select(`status, wish:wishes(${WISH_WITH_OWNER})`)
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = ((data ?? []) as unknown as { wish: never }[]).map((row) => row.wish).filter(Boolean);
  const wishes = await hydrateWishes(supabase, rows, viewer.id);
  const toBuy = wishes.filter((wish) => wish.reservation?.status !== "bought");
  const bought = wishes.filter((wish) => wish.reservation?.status === "bought");

  return (
    <>
      <PageHeader title="Gifts I'm giving" subtitle="Your secret list. Only you can see this." />

      {wishes.length === 0 ? (
        <EmptyState
          title="No gifts reserved yet"
          action={<LinkButton href="/occasions">See upcoming occasions</LinkButton>}
        >
          When you reserve a friend&apos;s wish, it shows up here.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          {toBuy.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">To buy</h2>
              <WishGrid wishes={toBuy} viewerId={viewer.id} />
            </section>
          )}
          {bought.length > 0 && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Bought</h2>
              <WishGrid wishes={bought} viewerId={viewer.id} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
