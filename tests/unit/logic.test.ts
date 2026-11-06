import { describe, expect, it } from "vitest";
import { daysUntilAnnual, daysUntilDate, formatPrice, timeAgo, todayInIndia, whenLabel } from "@/lib/format";
import { safeNext } from "@/lib/paths";
import {
  collectionSchema,
  isOwnImage,
  normalizeUrl,
  onboardingSchema,
  sanitizeSearch,
  usernameSchema,
  wishSchema,
} from "@/lib/validation";

const validWish = {
  title: "Kindle",
  description: "",
  price_inr: "",
  product_url: "",
  image_url: "",
  category: "books",
  priority: "high",
  visibility: "public",
  collection_id: "",
};

describe("safeNext blocks open redirects", () => {
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined])(
    "rejects %s",
    (value) => expect(safeNext(value)).toBe("/home"),
  );
  it("keeps internal paths", () => expect(safeNext("/wish/abc?x=1")).toBe("/wish/abc?x=1"));
});

describe("normalizeUrl", () => {
  it("adds https to bare links", () => expect(normalizeUrl("amazon.in/dp/B09")).toBe("https://amazon.in/dp/B09"));
  it("keeps full links", () => expect(normalizeUrl("https://www.flipkart.com/x?a=1")).toBe("https://www.flipkart.com/x?a=1"));
  it("treats blank as none", () => expect(normalizeUrl("  ")).toBeNull());
  it.each(["javascript:alert(1)", "data:text/html,hi", "vbscript:x", "file:///etc/passwd", "ftp://x.com/a", "not a url"])(
    "rejects %s",
    (value) => expect(() => normalizeUrl(value)).toThrow(),
  );
});

describe("usernames", () => {
  it("lowercases", () => expect(usernameSchema.parse(" Asha_K ")).toBe("asha_k"));
  it.each(["ab", "has space", "semi;colon", "admin", "user_0123456789ab"])("rejects %s", (value) =>
    expect(usernameSchema.safeParse(value).success).toBe(false),
  );
});

describe("wish form", () => {
  it("accepts the minimum", () => {
    const wish = wishSchema.parse(validWish);
    expect(wish.price_inr).toBeNull();
    expect(wish.product_url).toBeNull();
    expect(wish.collection_id).toBeNull();
  });
  it("reads Indian-formatted prices", () => {
    expect(wishSchema.parse({ ...validWish, price_inr: "₹1,49,999" }).price_inr).toBe(149999);
  });
  it.each(["-5", "12.50", "abc", "999999999"])("rejects price %s", (price_inr) =>
    expect(wishSchema.safeParse({ ...validWish, price_inr }).success).toBe(false),
  );
  it("rejects a script link with a readable message", () => {
    const result = wishSchema.safeParse({ ...validWish, product_url: "javascript:alert(1)" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("link");
  });
  it("rejects unknown categories", () =>
    expect(wishSchema.safeParse({ ...validWish, category: "weapons" }).success).toBe(false));
});

describe("collection form", () => {
  it("reads the checkbox", () => {
    const base = { name: "x", occasion: "birthday", event_date: "" };
    expect(collectionSchema.parse({ ...base, is_public: "on" }).is_public).toBe(true);
    expect(collectionSchema.parse(base).is_public).toBe(false);
  });
});

describe("birthdays", () => {
  const base = { username: "asha", full_name: "Asha" };
  it("is optional", () => {
    const result = onboardingSchema.parse({ ...base, birthday_month: "", birthday_day: "" });
    expect(result.birthday_month).toBeNull();
  });
  it("accepts 29 February", () =>
    expect(onboardingSchema.safeParse({ ...base, birthday_month: "2", birthday_day: "29" }).success).toBe(true));
  it("rejects impossible dates and half-filled ones", () => {
    expect(onboardingSchema.safeParse({ ...base, birthday_month: "2", birthday_day: "31" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, birthday_month: "4", birthday_day: "31" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, birthday_month: "4", birthday_day: "" }).success).toBe(false);
  });
});

describe("dates", () => {
  const today = new Date(Date.UTC(2026, 10, 6));
  it("counts today as zero", () => expect(daysUntilAnnual(11, 6, today)).toBe(0));
  it("counts forward", () => expect(daysUntilAnnual(11, 16, today)).toBe(10));
  it("wraps to next year", () => expect(daysUntilAnnual(11, 5, today)).toBe(364));
  it("handles dated events", () => expect(daysUntilDate("2026-11-08", today)).toBe(2));
  it("labels days", () => {
    expect(whenLabel(0)).toBe("Today");
    expect(whenLabel(1)).toBe("Tomorrow");
    expect(whenLabel(9)).toBe("In 9 days");
  });
  it("uses the Indian date just after midnight IST", () => {
    expect(todayInIndia(new Date("2026-11-06T19:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-07");
  });
});

describe("display helpers", () => {
  it("uses Indian digit grouping", () => expect(formatPrice(149999)).toBe("₹1,49,999"));
  it("shows zero but hides missing prices", () => {
    expect(formatPrice(0)).toBe("₹0");
    expect(formatPrice(null)).toBeNull();
  });
  it("describes recency", () => {
    const now = new Date("2026-11-06T12:00:00Z");
    expect(timeAgo("2026-11-06T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-11-06T09:00:00Z", now)).toBe("3h ago");
  });
});

describe("safety helpers", () => {
  it("strips filter syntax from search", () => {
    expect(sanitizeSearch(`a,b."c"(d)*%`)).toBe("a b c d");
    expect(sanitizeSearch("कुर्ता  blue")).toBe("कुर्ता blue");
  });
  it("only accepts images in the user's own folder", () => {
    const base = "https://x.supabase.co";
    const path = `${base}/storage/v1/object/public/wish-images`;
    expect(isOwnImage(`${path}/me/a.webp`, "wish-images", "me", base)).toBe(true);
    expect(isOwnImage(`${path}/you/a.webp`, "wish-images", "me", base)).toBe(false);
    expect(isOwnImage("https://evil.com/a.webp", "wish-images", "me", base)).toBe(false);
  });
});
