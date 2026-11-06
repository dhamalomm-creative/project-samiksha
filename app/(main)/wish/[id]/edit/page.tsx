import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/confirm-form";
import { WishForm } from "@/components/wish-form";
import { PageHeader } from "@/components/ui";
import { deleteWish, updateWish } from "@/lib/actions/wishes";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Wish } from "@/lib/types";

export const metadata: Metadata = { title: "Edit wish" };

export default async function EditWishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const [{ data: wish }, { data: collections }] = await Promise.all([
    supabase.from("wishes").select("*").eq("id", id).eq("owner_id", viewer.id).maybeSingle(),
    supabase.from("collections").select("id, name").eq("owner_id", viewer.id),
  ]);
  if (!wish) notFound();

  return (
    <>
      <PageHeader title="Edit wish" />
      <WishForm
        action={updateWish.bind(null, id)}
        userId={viewer.id}
        wish={wish as Wish}
        collections={collections ?? []}
      />
      <div className="mt-10 border-t border-line pt-6">
        <ConfirmForm
          action={deleteWish.bind(null, id)}
          message="Delete this wish? If someone reserved it, they'll be told it was removed."
          label="Delete wish"
        />
      </div>
    </>
  );
}
