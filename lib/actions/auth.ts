"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { actionClient } from "@/lib/auth";
import { safeNext, siteUrl } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  emailSchema,
  firstError,
  loginSchema,
  newPasswordSchema,
  signupSchema,
} from "@/lib/validation";

const origin = async () => siteUrl((await headers()).get("origin"));

export async function login(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error: error.code === "email_not_confirmed"
        ? "Please confirm your email first. Check your inbox."
        : "That email or password isn't right.",
    };
  }

  redirect(safeNext(formData.get("next")?.toString()));
}

export async function signup(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { email, password, full_name } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    if (error.code === "weak_password") return { error: "Please choose a stronger password." };
    if (error.code === "over_email_send_rate_limit") {
      return { error: "Too many attempts. Please try again in a few minutes." };
    }
    return { error: "We couldn't create your account. Please try again." };
  }

  if (data.session) redirect("/onboarding");
  return { ok: true, message: "Almost there. Check your email to confirm your account." };
}

export async function loginWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next")?.toString());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function sendPasswordReset(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  // Same reply either way, so this can't be used to discover who has an account.
  return { ok: true, message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const session = await actionClient();
  if (!session) return { error: "That link has expired. Please request a new one." };

  const { error } = await session.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error: error.code === "same_password"
        ? "Choose a password you haven't used here before."
        : "We couldn't update your password. Please try again.",
    };
  }
  return { ok: true, message: "Password updated." };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function deleteAccount(_: ActionResult, formData: FormData): Promise<ActionResult> {
  if (formData.get("confirm") !== "DELETE") return { error: "Type DELETE to confirm." };

  const session = await actionClient();
  if (!session) return { error: "Please log in again." };
  const { supabase, user } = session;

  // Uploaded images aren't covered by the database cascade, so clear them first.
  for (const bucket of ["wish-images", "avatars"]) {
    const { data: files } = await supabase.storage.from(bucket).list(user.id, { limit: 1000 });
    if (files?.length) {
      await supabase.storage.from(bucket).remove(files.map((file) => `${user.id}/${file.name}`));
    }
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: "We couldn't delete your account. Please contact support." };

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?deleted=1");
}
