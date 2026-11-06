import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (viewer && !viewer.profile.onboarded) redirect("/onboarding");

  let unread = 0;
  if (viewer) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);
    unread = count ?? 0;
  }

  return (
    <AppShell profile={viewer?.profile ?? null} unread={unread}>
      {children}
    </AppShell>
  );
}
