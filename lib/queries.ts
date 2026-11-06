import type { SupabaseClient } from "@supabase/supabase-js";
import type { Owner, Reservation, Wish, WishView } from "./types";

export const OWNER_FIELDS = "id, username, full_name, avatar_url";
export const WISH_WITH_OWNER = `*, owner:profiles!wishes_owner_id_fkey(${OWNER_FIELDS})`;

type WishRow = Wish & { owner: Owner };

/** Adds what this viewer needs on top of raw wish rows, in one batch per kind. */
export async function hydrateWishes(
  supabase: SupabaseClient,
  rows: WishRow[],
  viewerId: string | null,
): Promise<WishView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((wish) => wish.id);

  const [reservations, likes, saves] = await Promise.all([
    supabase.rpc("wish_reservations", { wish_ids: ids }),
    viewerId
      ? supabase.from("likes").select("wish_id").eq("user_id", viewerId).in("wish_id", ids)
      : Promise.resolve({ data: [] as { wish_id: string }[] }),
    viewerId
      ? supabase.from("saves").select("wish_id").eq("user_id", viewerId).in("wish_id", ids)
      : Promise.resolve({ data: [] as { wish_id: string }[] }),
  ]);

  const reservationById = new Map<string, Reservation>(
    ((reservations.data ?? []) as (Reservation & { wish_id: string })[]).map((row) => [
      row.wish_id,
      { mine: Boolean(row.mine), status: row.status },
    ]),
  );
  const liked = new Set((likes.data ?? []).map((row) => row.wish_id));
  const saved = new Set((saves.data ?? []).map((row) => row.wish_id));

  return rows.map((wish) => ({
    ...wish,
    reservation: reservationById.get(wish.id) ?? null,
    liked: liked.has(wish.id),
    saved: saved.has(wish.id),
  }));
}
