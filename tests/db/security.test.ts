import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { startDb } from "./harness";

let db: Awaited<ReturnType<typeof startDb>>;
let c: pg.Client;

const ANON = null;
let asha: string; // wish owner
let ravi: string; // gift-giver
let meera: string; // second friend
let wish: string; // Asha's public wish
let secret: string; // Asha's private wish

/** Runs one statement as a given user, the way PostgREST does. */
async function asOn(client: pg.Client, uid: string | null, sql: string, params: unknown[] = []) {
  await client.query("begin");
  try {
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" }),
    ]);
    await client.query(`set local role ${uid ? "authenticated" : "anon"}`);
    const result = await client.query(sql, params);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}
const as = (uid: string | null, sql: string, params: unknown[] = []) => asOn(c, uid, sql, params);

const signUp = async (name: string, meta: object = {}) =>
  (
    await c.query(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [
      `${name}@example.com`,
      JSON.stringify({ full_name: name, ...meta }),
    ])
  ).rows[0].id as string;

const addWish = async (owner: string, visibility = "public") =>
  (
    await as(
      owner,
      `insert into public.wishes (owner_id, title, visibility) values ($1, 'Kindle', $2) returning id`,
      [owner, visibility],
    )
  ).rows[0].id as string;

beforeAll(async () => {
  db = await startDb(54399);
  c = db.client;
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

beforeEach(async () => {
  await c.query("delete from auth.users");
  asha = await signUp("asha");
  ravi = await signUp("ravi");
  meera = await signUp("meera");
  wish = await addWish(asha);
  secret = await addWish(asha, "private");
});

describe("signup", () => {
  it("creates a profile with a placeholder username that hides the email", async () => {
    const { rows } = await as(asha, `select username, full_name, onboarded from public.profiles where id = $1`, [asha]);
    expect(rows[0].username).toMatch(/^user_[0-9a-f]{12}$/);
    expect(rows[0].full_name).toBe("asha");
    expect(rows[0].onboarded).toBe(false);
  });

  it("survives hostile provider metadata instead of blocking signup", async () => {
    const id = await signUp("x", { full_name: "y".repeat(500), avatar_url: "javascript:alert(1)" });
    const { rows } = await c.query(`select full_name, avatar_url from public.profiles where id = $1`, [id]);
    expect(rows[0].full_name).toHaveLength(80);
    expect(rows[0].avatar_url).toBeNull();
  });
});

describe("wish privacy and ownership", () => {
  it("hides private wishes from everyone but the owner", async () => {
    const q = `select id from public.wishes where id = $1`;
    expect((await as(ANON, q, [secret])).rowCount).toBe(0);
    expect((await as(ravi, q, [secret])).rowCount).toBe(0);
    expect((await as(asha, q, [secret])).rowCount).toBe(1);
  });

  it("shows public wishes to logged-out visitors", async () => {
    expect((await as(ANON, `select id from public.wishes where id = $1`, [wish])).rowCount).toBe(1);
  });

  it("stops anyone creating a wish for another user", async () => {
    await expect(as(ravi, `insert into public.wishes (owner_id, title) values ($1, 'x')`, [asha])).rejects.toThrow();
  });

  it("stops anyone editing or deleting another user's wish", async () => {
    expect((await as(ravi, `update public.wishes set title = 'hacked' where id = $1`, [wish])).rowCount).toBe(0);
    expect((await as(ravi, `delete from public.wishes where id = $1`, [wish])).rowCount).toBe(0);
  });

  it("stops an owner faking like counts or reassigning a wish", async () => {
    await expect(as(asha, `update public.wishes set like_count = 9999 where id = $1`, [wish])).rejects.toThrow(/permission denied/);
    await expect(as(asha, `update public.wishes set owner_id = $2 where id = $1`, [wish, ravi])).rejects.toThrow(/permission denied/);
  });

  it("rejects script links", async () => {
    await expect(
      as(asha, `update public.wishes set product_url = 'javascript:alert(1)' where id = $1`, [wish]),
    ).rejects.toThrow(/check constraint/);
  });

  it("refuses filing a wish in someone else's collection", async () => {
    const col = (await as(ravi, `insert into public.collections (owner_id, name) values ($1, 'x') returning id`, [ravi])).rows[0].id;
    await expect(as(asha, `update public.wishes set collection_id = $2 where id = $1`, [wish, col])).rejects.toThrow(/does not belong/);
  });

  it("keeps private collections private", async () => {
    const col = (await as(asha, `insert into public.collections (owner_id, name, is_public) values ($1, 'x', false) returning id`, [asha])).rows[0].id;
    expect((await as(ravi, `select id from public.collections where id = $1`, [col])).rowCount).toBe(0);
    expect((await as(asha, `select id from public.collections where id = $1`, [col])).rowCount).toBe(1);
  });
});

describe("gift reservations", () => {
  const reserve = (user: string, id = wish) =>
    as(user, `insert into public.reservations (wish_id, user_id) values ($1, $2)`, [id, user]);
  const state = async (user: string | null) =>
    (await as(user, `select * from public.wish_reservations($1)`, [[wish]])).rows;

  it("lets a friend reserve a wish", async () => {
    await reserve(ravi);
    expect(await state(ravi)).toEqual([{ wish_id: wish, mine: true, status: "reserved" }]);
  });

  it("never allows two people to reserve the same gift", async () => {
    await reserve(ravi);
    await expect(reserve(meera)).rejects.toThrow(/duplicate key/);
  });

  it("gives a simultaneous race exactly one winner", async () => {
    const clients = await Promise.all([db.connect(), db.connect(), db.connect(), db.connect()]);
    const users = [ravi, meera, await signUp("dev"), await signUp("zoya")];
    const results = await Promise.allSettled(
      clients.map((client, i) =>
        asOn(client, users[i], `insert into public.reservations (wish_id, user_id) values ($1, $2)`, [wish, users[i]]),
      ),
    );
    await Promise.all(clients.map((client) => client.end()));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(3);
  });

  it("hides everything from the owner, so the surprise survives", async () => {
    await reserve(ravi);
    expect(await state(asha)).toEqual([]);
    expect((await as(asha, `select * from public.reservations`)).rowCount).toBe(0);
    expect((await as(asha, `select * from public.notifications`)).rows).toEqual([]);
  });

  it("tells other friends it's taken, but not by whom or how far along", async () => {
    await reserve(ravi);
    await as(ravi, `update public.reservations set status = 'bought' where wish_id = $1`, [wish]);
    expect(await state(meera)).toEqual([{ wish_id: wish, mine: false, status: "reserved" }]);
    expect((await as(meera, `select * from public.reservations`)).rowCount).toBe(0);
  });

  it("shows logged-out visitors only that it's taken", async () => {
    await reserve(ravi);
    const rows = await state(ANON);
    expect(rows).toHaveLength(1);
    expect(rows[0].mine).toBeFalsy();
    await expect(as(ANON, `select * from public.reservations`)).rejects.toThrow(/permission denied/);
  });

  it("refuses reserving your own, private or received wishes", async () => {
    await expect(reserve(asha)).rejects.toThrow(/row-level security/);
    await expect(reserve(ravi, secret)).rejects.toThrow(/row-level security/);
    await as(asha, `update public.wishes set received = true where id = $1`, [wish]);
    await expect(reserve(ravi)).rejects.toThrow(/row-level security/);
  });

  it("refuses reserving as someone else", async () => {
    await expect(
      as(ravi, `insert into public.reservations (wish_id, user_id) values ($1, $2)`, [wish, meera]),
    ).rejects.toThrow(/row-level security/);
  });

  it("stops others cancelling your reservation", async () => {
    await reserve(ravi);
    expect((await as(meera, `delete from public.reservations where wish_id = $1`, [wish])).rowCount).toBe(0);
    expect((await as(asha, `delete from public.reservations where wish_id = $1`, [wish])).rowCount).toBe(0);
  });

  it("tells the giver when the wish is deleted", async () => {
    await reserve(ravi);
    await as(asha, `delete from public.wishes where id = $1`, [wish]);
    const { rows } = await as(ravi, `select type, body, wish_id from public.notifications`);
    expect(rows).toEqual([{ type: "gift_update", body: "A gift you reserved was removed: Kindle", wish_id: null }]);
  });

  it("tells the giver and releases the reservation when the wish goes private", async () => {
    await reserve(ravi);
    await as(asha, `update public.wishes set visibility = 'private' where id = $1`, [wish]);
    expect((await as(ravi, `select * from public.reservations`)).rowCount).toBe(0);
    expect((await as(ravi, `select * from public.notifications`)).rowCount).toBe(1);
    expect(await state(meera)).toEqual([]);
  });

  it("tells the giver when the owner marks the wish received", async () => {
    await reserve(ravi);
    await as(asha, `update public.wishes set received = true where id = $1`, [wish]);
    const { rows } = await as(ravi, `select body from public.notifications`);
    expect(rows[0].body).toContain("marked as received");
  });
});

describe("social", () => {
  it("keeps like counts accurate and blocks double likes", async () => {
    const like = (u: string) => as(u, `insert into public.likes (user_id, wish_id) values ($1, $2)`, [u, wish]);
    await like(ravi);
    await like(meera);
    await expect(like(ravi)).rejects.toThrow(/duplicate key/);
    await as(ravi, `delete from public.likes where user_id = $1 and wish_id = $2`, [ravi, wish]);
    const { rows } = await c.query(`select like_count from public.wishes where id = $1`, [wish]);
    expect(rows[0].like_count).toBe(1);
  });

  it("refuses liking, commenting on or saving a private wish you can't see", async () => {
    await expect(as(ravi, `insert into public.likes (user_id, wish_id) values ($1, $2)`, [ravi, secret])).rejects.toThrow(/row-level security/);
    await expect(as(ravi, `insert into public.comments (user_id, wish_id, body) values ($1, $2, 'hi')`, [ravi, secret])).rejects.toThrow(/row-level security/);
    await expect(as(ravi, `insert into public.saves (user_id, wish_id) values ($1, $2)`, [ravi, secret])).rejects.toThrow(/row-level security/);
  });

  it("doesn't notify you about your own actions", async () => {
    await as(asha, `insert into public.likes (user_id, wish_id) values ($1, $2)`, [asha, wish]);
    expect((await as(asha, `select * from public.notifications`)).rowCount).toBe(0);
  });

  it("sends one notification however often someone re-likes", async () => {
    for (let i = 0; i < 3; i++) {
      await as(ravi, `insert into public.likes (user_id, wish_id) values ($1, $2)`, [ravi, wish]);
      await as(ravi, `delete from public.likes where user_id = $1 and wish_id = $2`, [ravi, wish]);
    }
    expect((await as(asha, `select * from public.notifications`)).rowCount).toBe(1);
  });

  it("sends one notification however often someone re-follows", async () => {
    for (let i = 0; i < 3; i++) {
      await as(ravi, `insert into public.follows (follower_id, following_id) values ($1, $2)`, [ravi, asha]);
      await as(ravi, `delete from public.follows where follower_id = $1 and following_id = $2`, [ravi, asha]);
    }
    expect((await as(asha, `select * from public.notifications`)).rowCount).toBe(1);
  });

  it("stops following on someone's behalf or following yourself", async () => {
    await expect(as(ravi, `insert into public.follows (follower_id, following_id) values ($1, $2)`, [meera, asha])).rejects.toThrow(/row-level security/);
    await expect(as(ravi, `insert into public.follows (follower_id, following_id) values ($1, $1)`, [ravi])).rejects.toThrow(/check constraint/);
  });

  it("lets the author or wish owner remove a comment, nobody else", async () => {
    const add = async () =>
      (await as(ravi, `insert into public.comments (user_id, wish_id, body) values ($1, $2, 'nice') returning id`, [ravi, wish])).rows[0].id;
    const a = await add();
    expect((await as(meera, `delete from public.comments where id = $1`, [a])).rowCount).toBe(0);
    expect((await as(asha, `delete from public.comments where id = $1`, [a])).rowCount).toBe(1);
    const b = await add();
    expect((await as(ravi, `delete from public.comments where id = $1`, [b])).rowCount).toBe(1);
    const { rows } = await c.query(`select comment_count from public.wishes where id = $1`, [wish]);
    expect(rows[0].comment_count).toBe(0);
  });

  it("feeds you only public wishes from people you follow", async () => {
    await as(ravi, `insert into public.follows (follower_id, following_id) values ($1, $2)`, [ravi, asha]);
    const { rows } = await as(ravi, `select id from public.home_feed()`);
    expect(rows.map((r) => r.id)).toEqual([wish]);
    expect((await as(meera, `select id from public.home_feed()`)).rowCount).toBe(0);
  });
});

describe("personal data", () => {
  it("keeps notifications and saves private", async () => {
    await as(ravi, `insert into public.likes (user_id, wish_id) values ($1, $2)`, [ravi, wish]);
    await as(ravi, `insert into public.saves (user_id, wish_id) values ($1, $2)`, [ravi, wish]);
    expect((await as(meera, `select * from public.notifications`)).rowCount).toBe(0);
    expect((await as(meera, `select * from public.saves`)).rowCount).toBe(0);
  });

  it("stops users forging notifications", async () => {
    await expect(as(ravi, `insert into public.notifications (user_id, type) values ($1, 'follow')`, [asha])).rejects.toThrow(/permission denied/);
  });

  it("hides birthdays from logged-out visitors", async () => {
    await expect(as(ANON, `select birthday_month from public.profiles`)).rejects.toThrow(/permission denied/);
    await as(ANON, `select username from public.profiles`);
  });

  it("stops one user editing another's profile", async () => {
    expect((await as(ravi, `update public.profiles set bio = 'hacked' where id = $1`, [asha])).rowCount).toBe(0);
  });

  it("makes reports write-only", async () => {
    await as(ravi, `insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'wish', $2, 'spam')`, [ravi, wish]);
    await expect(as(asha, `select * from public.reports`)).rejects.toThrow(/permission denied/);
  });

  it("enforces unique usernames and a safe format", async () => {
    await as(asha, `update public.profiles set username = 'asha_k' where id = $1`, [asha]);
    await expect(as(ravi, `update public.profiles set username = 'asha_k' where id = $1`, [ravi])).rejects.toThrow(/duplicate key/);
    await expect(as(ravi, `update public.profiles set username = 'Bad Name!' where id = $1`, [ravi])).rejects.toThrow(/check constraint/);
  });

  it("confines uploads to the user's own folder", async () => {
    await as(ravi, `insert into storage.objects (bucket_id, name) values ('wish-images', $1)`, [`${ravi}/a.webp`]);
    await expect(
      as(ravi, `insert into storage.objects (bucket_id, name) values ('wish-images', $1)`, [`${asha}/a.webp`]),
    ).rejects.toThrow(/row-level security/);
  });
});

describe("account deletion", () => {
  it("removes the user's data and warns people who reserved their wishes", async () => {
    await as(ravi, `insert into public.reservations (wish_id, user_id) values ($1, $2)`, [wish, ravi]);
    await as(ravi, `insert into public.follows (follower_id, following_id) values ($1, $2)`, [ravi, asha]);
    await as(asha, `select public.delete_my_account()`);
    expect((await c.query(`select 1 from auth.users where id = $1`, [asha])).rowCount).toBe(0);
    expect((await c.query(`select 1 from public.profiles where id = $1`, [asha])).rowCount).toBe(0);
    expect((await c.query(`select 1 from public.wishes where owner_id = $1`, [asha])).rowCount).toBe(0);
    expect((await as(ravi, `select body from public.notifications`)).rows[0].body).toContain("removed");
  });

  it("cannot be called by a logged-out visitor", async () => {
    await expect(as(ANON, `select public.delete_my_account()`)).rejects.toThrow(/permission denied/);
  });
});
