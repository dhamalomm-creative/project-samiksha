import type { Metadata } from "next";
import { WishForm } from "@/components/wish-form";
import { PageHeader } from "@/components/ui";
import { createWish } from "@/lib/actions/wishes";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add a wish" };

export default async function NewWishPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string }>;
}) {
  const viewer = await requireViewer();
  const { collection } = await searchParams;
  const supabase = await createClient();
  const { data: collections } = await supabase
    .from("collections")
    .select("id, name")
    .eq("owner_id", viewer.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Add a wish" />
      <WishForm
        action={createWish}
        userId={viewer.id}
        collections={collections ?? []}
        defaultCollection={collection}
      />
    </>
  );
}
