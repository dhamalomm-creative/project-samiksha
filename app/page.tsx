import { EyeOff, Gift, ListPlus, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkButton, Logo } from "@/components/ui";
import { getViewer } from "@/lib/auth";

const STEPS = [
  {
    icon: ListPlus,
    title: "Make your list",
    body: "Add anything from any store: gadgets, books, a saree, a weekend away. Group them for your birthday or wedding.",
  },
  {
    icon: Send,
    title: "Share one link",
    body: "Drop it in the family WhatsApp group. Anyone can view your list without an account.",
  },
  {
    icon: EyeOff,
    title: "Friends reserve in secret",
    body: "They claim a gift so nobody doubles up. You never find out who picked what until the day.",
  },
];

const SAMPLE_WISHES = [
  { title: "Kindle Paperwhite", price: "₹14,999", status: "Reserved", tilt: "-rotate-3" },
  { title: "Pottery class for two", price: "₹3,500", status: null, tilt: "rotate-2" },
  { title: "Handloom cotton saree", price: "₹6,200", status: "Reserved", tilt: "-rotate-1" },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  if (await getViewer()) redirect("/home");
  const { deleted } = await searchParams;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <span className="hidden sm:block">
            <LinkButton href="/discover" variant="ghost">Discover</LinkButton>
          </span>
          <LinkButton href="/login" variant="ghost">Log in</LinkButton>
          <LinkButton href="/signup">Sign up free</LinkButton>
        </nav>
      </header>

      {deleted && (
        <p role="status" className="mx-auto max-w-6xl px-5 text-sm font-medium text-leaf">
          Your account and data have been deleted.
        </p>
      )}

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 md:grid-cols-2 md:pt-16">
          <div>
            <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">
              Get the gifts you actually want.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted">
              Samiksha is a wishlist you share with the people you love. They pick a gift and
              reserve it in secret, so no more duplicates, and the surprise stays a surprise.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/signup" className="h-12 px-6 text-base">
                Start your wishlist
              </LinkButton>
              <LinkButton href="/discover" variant="secondary" className="h-12 px-6 text-base">
                See what people wish for
              </LinkButton>
            </div>
          </div>

          <div aria-hidden className="relative mx-auto flex w-full max-w-sm flex-col gap-4 py-4">
            {SAMPLE_WISHES.map((wish) => (
              <div
                key={wish.title}
                className={`${wish.tilt} flex items-center gap-4 rounded-2xl border border-line bg-card p-4 shadow-sm`}
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-marigold-soft">
                  <Gift className="size-6 text-vermilion" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{wish.title}</span>
                  <span className="font-display text-lg font-semibold">{wish.price}</span>
                </span>
                {wish.status && (
                  <span className="rounded-full bg-marigold px-2.5 py-1 text-xs font-semibold">
                    {wish.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-line bg-card/60">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-3xl font-semibold sm:text-4xl">How it works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <Icon className="size-7 text-vermilion" strokeWidth={1.5} aria-hidden />
                  <h3 className="mt-3 text-xl font-semibold">{title}</h3>
                  <p className="mt-1.5 text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Birthday coming up? Wedding this winter?</h2>
          <p className="mx-auto mt-3 max-w-lg text-muted">
            Your first wishlist takes about two minutes. It&apos;s free.
          </p>
          <LinkButton href="/signup" className="mt-7 h-12 px-6 text-base">
            Start your wishlist
          </LinkButton>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-5 py-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} Samiksha</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
