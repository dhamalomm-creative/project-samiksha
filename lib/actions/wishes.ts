"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient } from "@/lib/auth";
import { supabaseUrl } from "@/lib/supabase/env";
import type { ActionResult } from "@/lib/types";
import { collectionSchema, firstError, isOwnImage, wishSchema } from "@/lib/validation";

const SESSION_ENDED = { error: "Your session ended. Please log in again." };
const refreshAll = () => revalidatePath("/", "layout");

function parseWish(formData: FormData, userId: string) {
  const parsed = wishSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { image_url, ...rest } = parsed.data;
  if (image_url && !isOwnImage(image_url, "wish-images", userId, supabaseUrl())) {
    return { error: "Please upload the image again." };
  }
  return { data: { ...rest, image_url: image_url || null } };
}

export async function createWish(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;

  const wish = parseWish(formData, session.user.id);
  if ("error" in wish) return { error: wish.error };

  const { data, error } = await session.supabase
    .from("wishes")
    .insert({ ...wish.data, owner_id: session.user.id })
    .select("id")
    .single();
  if (error) return { error: "We couldn't save your wish. Please try again." };

  refreshAll();
  redirect(`/wish/${data.id}?added=1`);
}

export async function updateWish(id: string, _: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;

  const wish = parseWish(formData, session.user.id);
  if ("error" in wish) return { error: wish.error };

  const { error, count } = await session.supabase
    .from("wishes")
    .update(wish.data, { count: "exact" })
    .eq("id", id);
  if (error || count === 0) return { error: "We couldn't save your changes." };

  refreshAll();
  redirect(`/wish/${id}`);
}

export async function deleteWish(id: string) {
  const session = await actionClient();
  if (!session) redirect("/login");

  const { data: wish } = await session.supabase
    .from("wishes")
    .select("image_url")
    .eq("id", id)
    .maybeSingle();
  await session.supabase.from("wishes").delete().eq("id", id);

  const path = wish?.image_url?.split("/wish-images/")[1];
  if (path) await session.supabase.storage.from("wish-images").remove([path]);

  refreshAll();
  redirect("/wishes");
}

export async function setReceived(id: string, received: boolean): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;
  const { error } = await session.supabase.from("wishes").update({ received }).eq("id", id);
  if (error) return { error: "We couldn't update this wish." };
  refreshAll();
  return { ok: true };
}

export async function reserveWish(wishId: string): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;

  const { error } = await session.supabase
    .from("reservations")
    .insert({ wish_id: wishId, user_id: session.user.id });
  refreshAll();

  if (error?.code === "23505") return { error: "Someone just reserved this gift." };
  if (error) return { error: "This gift can't be reserved right now." };
  return { ok: true };
}

export async function releaseReservation(wishId: string): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;
  const { error } = await session.supabase
    .from("reservations")
    .delete()
    .eq("wish_id", wishId)
    .eq("user_id", session.user.id);
  if (error) return { error: "We couldn't release this gift." };
  refreshAll();
  return { ok: true };
}

export async function setReservationStatus(
  wishId: string,
  status: "reserved" | "bought",
): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;
  const { error } = await session.supabase
    .from("reservations")
    .update({ status })
    .eq("wish_id", wishId)
    .eq("user_id", session.user.id);
  if (error) return { error: "We couldn't update this gift." };
  refreshAll();
  return { ok: true };
}

export async function createCollection(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;

  const parsed = collectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { data, error } = await session.supabase
    .from("collections")
    .insert({ ...parsed.data, owner_id: session.user.id })
    .select("id")
    .single();
  if (error) return { error: "We couldn't create this collection." };

  refreshAll();
  redirect(`/collections/${data.id}`);
}

export async function updateCollection(id: string, _: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;

  const parsed = collectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { error } = await session.supabase.from("collections").update(parsed.data).eq("id", id);
  if (error) return { error: "We couldn't save this collection." };

  refreshAll();
  return { ok: true, message: "Collection saved." };
}

export async function deleteCollection(id: string) {
  const session = await actionClient();
  if (!session) redirect("/login");
  await session.supabase.from("collections").delete().eq("id", id);
  refreshAll();
  redirect("/collections");
}
