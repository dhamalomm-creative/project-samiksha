"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient } from "@/lib/auth";
import { supabaseUrl } from "@/lib/supabase/env";
import type { ActionResult } from "@/lib/types";
import { firstError, isOwnImage, onboardingSchema, profileSchema } from "@/lib/validation";

const USERNAME_TAKEN = "23505";

export async function completeOnboarding(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return { error: "Your session ended. Please log in again." };

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { error } = await session.supabase
    .from("profiles")
    .update({ ...parsed.data, onboarded: true })
    .eq("id", session.user.id);
  if (error?.code === USERNAME_TAKEN) return { error: "That username is taken. Try another." };
  if (error) return { error: "We couldn't save that. Please try again." };

  revalidatePath("/", "layout");
  redirect("/wishes");
}

export async function updateProfile(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await actionClient();
  if (!session) return { error: "Your session ended. Please log in again." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { avatar_url, ...fields } = parsed.data;

  // A new photo must be our own upload. An unchanged one may be a Google photo.
  const { data: current } = await session.supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", session.user.id)
    .single();
  if (
    avatar_url &&
    avatar_url !== current?.avatar_url &&
    !isOwnImage(avatar_url, "avatars", session.user.id, supabaseUrl())
  ) {
    return { error: "Please upload the photo again." };
  }

  const { error } = await session.supabase
    .from("profiles")
    .update({ ...fields, avatar_url: avatar_url || null })
    .eq("id", session.user.id);
  if (error?.code === USERNAME_TAKEN) return { error: "That username is taken. Try another." };
  if (error) return { error: "We couldn't save your profile." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}
