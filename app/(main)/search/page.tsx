import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { WishGrid } from "@/components/wish-card";
import { getViewer } from "@/lib/auth";
import { displayName } from "@/lib/format";
import { OWNER_FIELDS, WISH_WITH_OWNER, hydrateWishes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Owner } from "@/lib/types";
import { sanitizeSearch } from "@/lib/validation";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const term = sanitizeSearch(q);
  const viewer = await getViewer();
  const supabase = await createClient();

  let people: Owner[] = [];
  let wishRows: unknown[] = [];
  if (term.length >= 2) {
    const [peopleResult, wishResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(OWNER_FIELDS)
        .eq("onboarded", true)
        .or(`username.ilike."%${term}%",full_name.ilike."%${term}%"`)
        .limit(12),
      supabase
        .from("wishes")
        .select(WISH_WITH_OWNER)
        .eq("visibility", "public")
        .ilike("title", `%${term}%`)
        .order("created_at", { ascending: false })
        .limit(24),
    ]);
    people = (peopleResult.data ?? []) as Owner[];
    wishRows = wishResult.data ?? [];
  }
  const wishes = await hydrateWishes(supabase, wishRows as never, viewer?.id ?? null);

  return (
    <>
      <PageHeader title="Search" />
      <form action="/search" role="search" className="mb-6 flex max-w-xl gap-2">
        <Input name="q" type="search" defaultValue={q} aria-label="Search people and wishes" placeholder="Names, usernames, gift ideas" />
        <Button type="submit">Search</Button>
      </form>

      {term.length >= 2 && people.length === 0 && wishes.length === 0 && (
        <EmptyState title="No matches">Try a different name or gift idea.</EmptyState>
      )}

      {people.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">People</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((person) => (
              <Link key={person.id} href={`/u/${person.username}`}>
                <Card className="flex items-center gap-3 p-3 transition hover:bg-sand">
                  <Avatar person={person} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{displayName(person)}</span>
                    <span className="block truncate text-sm text-muted">@{person.username}</span>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {wishes.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Wishes</h2>
          <WishGrid wishes={wishes} viewerId={viewer?.id ?? null} />
        </section>
      )}
    </>
  );
}
