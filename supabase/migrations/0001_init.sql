-- Samiksha schema. Run once on a NEW Supabase project.
--
-- Security model: the browser talks to Postgres directly, so these rules ARE the
-- backend's security. Every table has row level security, and clients get
-- explicit per-column grants so they can't touch owner ids or counters.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  username       text not null unique
                 check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name      text not null default '' check (char_length(full_name) <= 80),
  bio            text not null default '' check (char_length(bio) <= 300),
  avatar_url     text check (avatar_url ~ '^https?://'),
  location       text not null default '' check (char_length(location) <= 80),
  website        text check (website ~ '^https?://'),
  birthday_month smallint check (birthday_month between 1 and 12),
  birthday_day   smallint check (birthday_day between 1 and 31),
  onboarded      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint birthday_complete check ((birthday_month is null) = (birthday_day is null))
);

create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  occasion    text not null default 'general'
              check (occasion in ('general', 'birthday', 'wedding', 'anniversary',
                                  'baby', 'housewarming', 'festival', 'graduation')),
  event_date  date,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index collections_owner_idx on public.collections (owner_id, created_at desc);
create index collections_event_idx on public.collections (event_date) where is_public;

create table public.wishes (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete set null,
  title         text not null check (char_length(title) between 1 and 120),
  description   text not null default '' check (char_length(description) <= 1000),
  image_url     text check (image_url ~ '^https?://'),
  -- Blocks javascript: links, because this value is rendered as an href.
  product_url   text check (product_url ~ '^https?://'),
  price_inr     integer check (price_inr between 0 and 100000000),
  category      text not null default 'other'
                check (category in ('electronics', 'fashion', 'home', 'books', 'beauty',
                                    'toys', 'sports', 'travel', 'experiences', 'other')),
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  visibility    text not null default 'public' check (visibility in ('public', 'private')),
  received      boolean not null default false,
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index wishes_owner_idx on public.wishes (owner_id, created_at desc);
create index wishes_collection_idx on public.wishes (collection_id);
create index wishes_public_recent_idx on public.wishes (created_at desc) where visibility = 'public';
create index wishes_public_popular_idx on public.wishes (like_count desc, created_at desc) where visibility = 'public';

-- One row per wish: the primary key is what makes double-booking impossible.
create table public.reservations (
  wish_id    uuid primary key references public.wishes (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'reserved' check (status in ('reserved', 'bought')),
  created_at timestamptz not null default now()
);
create index reservations_user_idx on public.reservations (user_id, created_at desc);

create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

create table public.likes (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  wish_id    uuid not null references public.wishes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, wish_id)
);
create index likes_wish_idx on public.likes (wish_id);

create table public.saves (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  wish_id    uuid not null references public.wishes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, wish_id)
);
create index saves_wish_idx on public.saves (wish_id);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  wish_id    uuid not null references public.wishes (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_wish_idx on public.comments (wish_id, created_at);
create index comments_user_idx on public.comments (user_id);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  actor_id   uuid references public.profiles (id) on delete cascade,
  type       text not null check (type in ('follow', 'like', 'comment', 'gift_update')),
  wish_id    uuid references public.wishes (id) on delete cascade,
  body       text not null default '',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_actor_idx on public.notifications (actor_id);
create index notifications_wish_idx on public.notifications (wish_id);
-- Stops like/unlike or follow/unfollow loops from spamming someone.
create unique index notifications_once_idx
  on public.notifications (user_id, actor_id, type, wish_id) nulls not distinct
  where type in ('follow', 'like');

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('wish', 'comment', 'profile')),
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 1 and 500),
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

-- ---------------------------------------------------------------------------
-- Trigger functions
-- ---------------------------------------------------------------------------

-- Creates a profile at signup. Must never fail, or the signup itself fails, so
-- provider metadata is sanitised rather than trusted. The placeholder username
-- avoids exposing the email address; onboarding replaces it.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  meta_avatar text := coalesce(new.raw_user_meta_data ->> 'avatar_url',
                               new.raw_user_meta_data ->> 'picture');
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    'user_' || left(replace(new.id::text, '-', ''), 12),
    left(coalesce(new.raw_user_meta_data ->> 'full_name',
                  new.raw_user_meta_data ->> 'name', ''), 80),
    case when meta_avatar like 'https://%' then meta_avatar end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger wishes_touch before update on public.wishes
  for each row execute function public.touch_updated_at();

-- A wish can only be filed under its owner's own collection.
create function public.check_wish_collection()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.collection_id is not null and not exists (
    select 1 from public.collections c
    where c.id = new.collection_id and c.owner_id = new.owner_id
  ) then
    raise exception 'Collection does not belong to this user' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger wishes_check_collection
  before insert or update of collection_id on public.wishes
  for each row execute function public.check_wish_collection();

create function public.count_likes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.wishes set like_count = like_count + 1 where id = new.wish_id;
  else
    update public.wishes set like_count = greatest(like_count - 1, 0) where id = old.wish_id;
  end if;
  return null;
end $$;

create trigger likes_count after insert or delete on public.likes
  for each row execute function public.count_likes();

create function public.count_comments()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    update public.wishes set comment_count = comment_count + 1 where id = new.wish_id;
  else
    update public.wishes set comment_count = greatest(comment_count - 1, 0) where id = old.wish_id;
  end if;
  return null;
end $$;

create trigger comments_count after insert or delete on public.comments
  for each row execute function public.count_comments();

create function public.notify_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select owner_id into recipient from public.wishes where id = new.wish_id;
  if recipient is distinct from new.user_id then
    insert into public.notifications (user_id, actor_id, type, wish_id)
    values (recipient, new.user_id, 'like', new.wish_id)
    on conflict (user_id, actor_id, type, wish_id)
      where type in ('follow', 'like') do nothing;
  end if;
  return null;
end $$;

create trigger likes_notify after insert on public.likes
  for each row execute function public.notify_like();

create function public.notify_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select owner_id into recipient from public.wishes where id = new.wish_id;
  if recipient is distinct from new.user_id then
    insert into public.notifications (user_id, actor_id, type, wish_id, body)
    values (recipient, new.user_id, 'comment', new.wish_id, left(new.body, 140));
  end if;
  return null;
end $$;

create trigger comments_notify after insert on public.comments
  for each row execute function public.notify_comment();

create function public.notify_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow')
  on conflict (user_id, actor_id, type, wish_id)
    where type in ('follow', 'like') do nothing;
  return null;
end $$;

create trigger follows_notify after insert on public.follows
  for each row execute function public.notify_follow();

-- Tells a gift-giver when the wish they reserved changed. Deliberately there is
-- no notification to the owner when a gift is reserved: that would spoil it.
-- actor_id stays null because the owner's profile may already be gone when this
-- runs as part of an account deletion.
create function public.notify_gift_giver()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  giver uuid;
  wish_title text := coalesce(old.title, '');
begin
  -- The join skips a giver being deleted in the same statement as this wish.
  select r.user_id into giver
  from public.reservations r
  join public.profiles p on p.id = r.user_id
  where r.wish_id = old.id;
  if giver is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    insert into public.notifications (user_id, type, body)
    values (giver, 'gift_update', 'A gift you reserved was removed: ' || wish_title);
    return old;
  end if;

  if new.visibility = 'private' and old.visibility = 'public' then
    insert into public.notifications (user_id, type, body)
    values (giver, 'gift_update', 'A gift you reserved is no longer available: ' || wish_title);
    delete from public.reservations where wish_id = old.id;
  elsif new.received and not old.received then
    insert into public.notifications (user_id, type, wish_id, body)
    values (giver, 'gift_update', old.id, 'A gift you reserved was marked as received: ' || wish_title);
  end if;
  return new;
end $$;

create trigger wishes_notify_giver_delete before delete on public.wishes
  for each row execute function public.notify_gift_giver();
create trigger wishes_notify_giver_update after update of visibility, received on public.wishes
  for each row execute function public.notify_gift_giver();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.collections   enable row level security;
alter table public.wishes        enable row level security;
alter table public.reservations  enable row level security;
alter table public.follows       enable row level security;
alter table public.likes         enable row level security;
alter table public.saves         enable row level security;
alter table public.comments      enable row level security;
alter table public.notifications enable row level security;
alter table public.reports       enable row level security;

-- `(select auth.uid())` is evaluated once per query rather than once per row.

create policy "profiles readable" on public.profiles
  for select to anon, authenticated using (true);
create policy "own profile editable" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "collections readable" on public.collections
  for select to anon, authenticated
  using (is_public or owner_id = (select auth.uid()));
create policy "own collections insert" on public.collections
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "own collections update" on public.collections
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own collections delete" on public.collections
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "wishes readable" on public.wishes
  for select to anon, authenticated
  using (visibility = 'public' or owner_id = (select auth.uid()));
create policy "own wishes insert" on public.wishes
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "own wishes update" on public.wishes
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "own wishes delete" on public.wishes
  for delete to authenticated using (owner_id = (select auth.uid()));

-- The gift-giver alone can read a reservation row. The owner's only view of
-- anything reservation-related is nothing at all; everyone else gets a yes/no
-- from wish_reservations() below.
create policy "own reservations readable" on public.reservations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reserve others' open wishes" on public.reservations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wishes w
      where w.id = wish_id
        and w.owner_id <> (select auth.uid())
        and w.visibility = 'public'
        and not w.received
    )
  );
create policy "own reservations update" on public.reservations
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own reservations delete" on public.reservations
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "follows readable" on public.follows
  for select to anon, authenticated using (true);
create policy "follow as self" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "unfollow as self" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- Reading a like or comment requires being able to read its wish, because the
-- wishes policy applies inside these subqueries.
create policy "likes readable" on public.likes
  for select to anon, authenticated
  using (exists (select 1 from public.wishes w where w.id = wish_id));
create policy "like as self" on public.likes
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.wishes w where w.id = wish_id));
create policy "unlike as self" on public.likes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "own saves readable" on public.saves
  for select to authenticated using (user_id = (select auth.uid()));
create policy "save as self" on public.saves
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.wishes w where w.id = wish_id));
create policy "unsave as self" on public.saves
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "comments readable" on public.comments
  for select to anon, authenticated
  using (exists (select 1 from public.wishes w where w.id = wish_id));
create policy "comment as self" on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.wishes w where w.id = wish_id));
create policy "delete own comment or on own wish" on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.wishes w
                    where w.id = wish_id and w.owner_id = (select auth.uid())));

create policy "own notifications readable" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own notifications update" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notifications delete" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- Reports are write-only for users; review them in the Supabase dashboard.
create policy "report as self" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Functions the app calls
-- ---------------------------------------------------------------------------

-- Home feed: recent wishes from people you follow. Runs as the caller so RLS applies.
create function public.home_feed(before_ts timestamptz default null, page_size integer default 24)
returns setof public.wishes
language sql stable security invoker set search_path = '' as $$
  select w.*
  from public.wishes w
  join public.follows f on f.following_id = w.owner_id
  where f.follower_id = (select auth.uid())
    and w.visibility = 'public'
    and (before_ts is null or w.created_at < before_ts)
  order by w.created_at desc
  limit least(greatest(page_size, 1), 60);
$$;

-- Reservation state for a batch of wishes, for anyone except the wish's owner.
-- Runs with elevated rights because the caller can't read others' reservations,
-- so it returns the bare minimum: never who reserved, and nothing to the owner.
create function public.wish_reservations(wish_ids uuid[])
returns table (wish_id uuid, mine boolean, status text)
language sql stable security definer set search_path = '' as $$
  select r.wish_id,
         r.user_id = (select auth.uid()) as mine,
         case when r.user_id = (select auth.uid()) then r.status else 'reserved' end as status
  from public.reservations r
  join public.wishes w on w.id = r.wish_id
  where r.wish_id = any (wish_ids)
    and w.visibility = 'public'
    and w.owner_id is distinct from (select auth.uid());
$$;

-- Lets a user remove their own account without exposing a service key. Profile
-- and everything hanging off it goes with it through foreign key cascades.
create function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end $$;

-- ---------------------------------------------------------------------------
-- Grants. Supabase grants everything by default, so start from nothing.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

-- Birthdays are not readable by logged-out visitors.
grant select (id, username, full_name, bio, avatar_url, location, website, onboarded, created_at)
  on public.profiles to anon;
grant select on public.profiles to authenticated;
grant update (username, full_name, bio, avatar_url, location, website,
              birthday_month, birthday_day, onboarded)
  on public.profiles to authenticated;

grant select on public.collections to anon, authenticated;
grant insert, delete on public.collections to authenticated;
grant update (name, occasion, event_date, is_public) on public.collections to authenticated;

grant select on public.wishes to anon, authenticated;
grant delete on public.wishes to authenticated;
-- Counters and ids are excluded so nobody can fake likes or take over a wish.
grant insert (owner_id, collection_id, title, description, image_url, product_url,
              price_inr, category, priority, visibility, received)
  on public.wishes to authenticated;
grant update (collection_id, title, description, image_url, product_url,
              price_inr, category, priority, visibility, received)
  on public.wishes to authenticated;

grant select, insert, delete on public.reservations to authenticated;
grant update (status) on public.reservations to authenticated;

grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

grant select on public.likes to anon, authenticated;
grant insert, delete on public.likes to authenticated;

grant select, insert, delete on public.saves to authenticated;

grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;

grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant insert on public.reports to authenticated;

grant execute on function public.home_feed(timestamptz, integer) to authenticated;
grant execute on function public.wish_reservations(uuid[]) to anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Image storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('wish-images', 'wish-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars',     'avatars',     true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

-- Files live under <user id>/..., and users can only touch their own folder.
create policy "own images readable" on storage.objects
  for select to authenticated
  using (bucket_id in ('wish-images', 'avatars')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own images insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('wish-images', 'avatars')
              and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own images update" on storage.objects
  for update to authenticated
  using (bucket_id in ('wish-images', 'avatars')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own images delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('wish-images', 'avatars')
         and (storage.foldername(name))[1] = (select auth.uid())::text);
