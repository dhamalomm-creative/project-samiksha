import type { Metadata } from "next";
import Link from "next/link";
import { clsx } from "clsx";
import { WishGrid } from "@/components/wish-card";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { CATEGORIES, PAGE_SIZE } from "@/lib/constants";
import { WISH_WITH_OWNER, hydrateWishes } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Discover",
  description: "Gift ideas from what people across India are wishing for.",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}) {
  const { category, sort, page } = await searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();

  const pageNumber = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const popular = sort === "popular";
  const activeCategory = CATEGORIES.some((item) => item.value === category) ? category : undefined;

  let query = supabase
    .from("wishes")
    .select(WISH_WITH_OWNER)
    .eq("visibility", "public")
    .eq("received", false);
  if (activeCategory) query = query.eq("category", activeCategory);
  if (popular) query = query.order("like_count", { ascending: false });
  const { data } = await query
    .order("created_at", { ascending: false })
    .range((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE - 1);

  const wishes = await hydrateWishes(supabase, (data ?? []) as never, viewer?.id ?? null);

  const href = (changes: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { category: activeCategory, sort: popular ? "popular" : undefined, ...changes };
    Object.entries(merged).forEach(([key, value]) => value && params.set(key, value));
    const search = params.toString();
    return search ? `/discover?${search}` : "/discover";
  };

  const chip = (active: boolean) =>
    clsx(
      "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition",
      active ? "border-ink bg-ink text-paper" : "border-line bg-card text-muted hover:text-ink",
    );

  return (
    <>
      <PageHeader title="Discover" subtitle="Gift ideas from what people are wishing for." />

      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Link href={href({ category: undefined, page: undefined })} className={chip(!activeCategory)}>
          All
        </Link>
        {CATEGORIES.map((item) => (
          <Link
            key={item.value}
            href={href({ category: item.value, page: undefined })}
            className={chip(activeCategory === item.value)}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mb-5 flex gap-4 text-sm font-semibold">
        <Link href={href({ sort: undefined, page: undefined })} className={popular ? "text-muted" : "text-vermilion"}>
          Newest
        </Link>
        <Link href={href({ sort: "popular", page: undefined })} className={popular ? "text-vermilion" : "text-muted"}>
          Most loved
        </Link>
      </div>

      {wishes.length > 0 ? (
        <WishGrid wishes={wishes} viewerId={viewer?.id ?? null} />
      ) : (
        <EmptyState
          title="Nothing here yet"
          action={viewer ? <LinkButton href="/wish/new">Add a wish</LinkButton> : undefined}
        >
          Be the first to add a wish{activeCategory ? " in this category" : ""}.
        </EmptyState>
      )}

      {(pageNumber > 1 || wishes.length === PAGE_SIZE) && (
        <div className="mt-8 flex justify-center gap-3">
          {pageNumber > 1 && (
            <LinkButton variant="secondary" href={href({ page: String(pageNumber - 1) })}>
              Previous
            </LinkButton>
          )}
          {wishes.length === PAGE_SIZE && (
            <LinkButton variant="secondary" href={href({ page: String(pageNumber + 1) })}>
              Next
            </LinkButton>
          )}
        </div>
      )}
    </>
  );
}
