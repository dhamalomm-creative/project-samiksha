"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";
import { commentSchema, firstError, reportSchema } from "@/lib/validation";

const SESSION_ENDED = { error: "Please log in first." };
const refreshAll = () => revalidatePath("/", "layout");

const IGNORE_DUPLICATE = "23505";

export async function toggleLike(wishId: string, liked: boolean): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;
  const { supabase, user } = session;

  const { error } = liked
    ? await supabase.from("likes").insert({ user_id: user.id, wish_id: wishId })
    : await supabase.from("likes").delete().eq("user_id", user.id).eq("wish_id", wishId);
  if (error && error.code !== IGNORE_DUPLICATE) return { error: "That didn't work. Please try again." };

  refreshAll();
  return { ok: true };
}

export async function toggleSave(wishId: string, saved: boolean): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;
  const { supabase, user } = session;

  const { error } = saved
    ? await supabase.from("saves").insert({ user_id: user.id, wish_id: wishId })
    : await supabase.from("saves").delete().eq("user_id", user.id).eq("wish_id", wishId);
  if (error && error.code !== IGNORE_DUPLICATE) return { error: "That didn't work. Please try again." };

  refreshAll();
  return { ok: true };
}

export async function toggleFollow(profileId: string, follow: boolean): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;
  const { supabase, user } = session;

  const { error } = follow
    ? await supabase.from("follows").insert({ follower_id: user.id, following_id: profileId })
    : await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileId);
  if (error && error.code !== IGNORE_DUPLICATE) return { error: "That didn't work. Please try again." };

  refreshAll();
  return { ok: true };
}

export async function addComment(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;

  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { error } = await session.supabase
    .from("comments")
    .insert({ ...parsed.data, user_id: session.user.id });
  if (error) return { error: "We couldn't post your comment." };

  refreshAll();
  return { ok: true };
}

export async function deleteComment(id: string): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;
  const { error } = await session.supabase.from("comments").delete().eq("id", id);
  if (error) return { error: "We couldn't remove that comment." };
  refreshAll();
  return { ok: true };
}

export async function markAllRead() {
  const session = await actionClient();
  if (!session) return;
  await session.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.user.id)
    .is("read_at", null);
  refreshAll();
}

export async function reportContent(input: unknown): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return SESSION_ENDED;

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { error } = await session.supabase
    .from("reports")
    .insert({ ...parsed.data, reporter_id: session.user.id });
  if (error && error.code !== IGNORE_DUPLICATE) return { error: "We couldn't send your report." };
  return { ok: true, message: "Thanks. We'll take a look." };
}
