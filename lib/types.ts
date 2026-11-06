export type Priority = "low" | "medium" | "high";
export type Visibility = "public" | "private";

export type Owner = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

export type Profile = Owner & {
  bio: string;
  location: string;
  website: string | null;
  birthday_month?: number | null;
  birthday_day?: number | null;
  onboarded: boolean;
  created_at: string;
};

export type Wish = {
  id: string;
  owner_id: string;
  collection_id: string | null;
  title: string;
  description: string;
  image_url: string | null;
  product_url: string | null;
  price_inr: number | null;
  category: string;
  priority: Priority;
  visibility: Visibility;
  received: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
};

export type Reservation = { mine: boolean; status: "reserved" | "bought" };

/** A wish plus everything the current viewer needs to see about it. */
export type WishView = Wish & {
  owner: Owner;
  reservation: Reservation | null;
  liked: boolean;
  saved: boolean;
};

export type Collection = {
  id: string;
  owner_id: string;
  name: string;
  occasion: string;
  event_date: string | null;
  is_public: boolean;
  created_at: string;
};

export type Comment = {
  id: string;
  wish_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: Owner;
};

export type Notification = {
  id: string;
  type: "follow" | "like" | "comment" | "gift_update";
  wish_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
  actor: Owner | null;
};

export type ActionResult = { error?: string; ok?: boolean; message?: string };
