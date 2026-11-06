import { Cake, PartyPopper } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { OCCASIONS, labelFor } from "@/lib/constants";
import { daysUntilAnnual, daysUntilDate, displayName, todayInIndia, whenLabel } from "@/lib/format";
import { OWNER_FIELDS } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { Owner } from "@/lib/types";

export const metadata: Metadata = { title: "Occasions" };

const WINDOW_DAYS = 90;

type Upcoming = {
  key: string;
  days: number;
  title: string;
  person: Owner;
  href: string;
  birthday: boolean;
};

export default async function OccasionsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const today = todayInIndia();

  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewer.id)
    .limit(1000);
  const ids = (following ?? []).map((row) => row.following_id);

  const [{ data: people }, { data: collections }] = await Promise.all([
    supabase
      .from("profiles")
      .select(`${OWNER_FIELDS}, birthday_month, birthday_day`)
      .in("id", ids)
      .not("birthday_month", "is", null),
    supabase
      .from("collections")
      .select(`id, name, occasion, event_date, owner:profiles!collections_owner_id_fkey(${OWNER_FIELDS})`)
      .in("owner_id", ids)
      .eq("is_public", true)
      .gte("event_date", today.toISOString().slice(0, 10)),
  ]);

  const birthdays: Upcoming[] = ((people ?? []) as (Owner & { birthday_month: number; birthday_day: number })[]).map(
    (person) => ({
      key: `birthday-${person.id}`,
      days: daysUntilAnnual(person.birthday_month, person.birthday_day, today),
      title: `${displayName(person)}'s birthday`,
      person,
      href: `/u/${person.username}`,
      birthday: true,
    }),
  );

  type EventRow = { id: string; name: string; occasion: string; event_date: string; owner: unknown };
  const events: Upcoming[] = ((collections ?? []) as unknown as EventRow[]).map((row) => ({
    key: `event-${row.id}`,
    days: daysUntilDate(row.event_date, today),
    title: `${row.name} (${labelFor(OCCASIONS, row.occasion)})`,
    person: row.owner as Owner,
    href: `/collections/${row.id}`,
    birthday: false,
  }));

  const upcoming = [...birthdays, ...events]
    .filter((item) => item.days <= WINDOW_DAYS)
    .sort((a, b) => a.days - b.days);

  return (
    <>
      <PageHeader title="Occasions" subtitle="Birthdays and events coming up in the next three months." />

      {upcoming.length === 0 ? (
        <EmptyState title="Nothing coming up" action={<LinkButton href="/discover">Find people to follow</LinkButton>}>
          {ids.length === 0
            ? "Follow friends to see their birthdays and events here."
            : "When people you follow add a birthday or dated collection, it shows up here."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {upcoming.map((item) => (
            <li key={item.key}>
              <Link href={item.href}>
                <Card className="flex items-center gap-3 p-3.5 transition hover:bg-sand">
                  <Avatar person={item.person} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.title}</span>
                    <span className="inline-flex items-center gap-1 text-sm text-muted">
                      {item.birthday ? (
                        <Cake className="size-4" aria-hidden />
                      ) : (
                        <PartyPopper className="size-4" aria-hidden />
                      )}
                      {whenLabel(item.days)}
                    </span>
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
