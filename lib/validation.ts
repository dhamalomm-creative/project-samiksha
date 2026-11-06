import { z } from "zod";
import { CATEGORIES, OCCASIONS } from "./constants";

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "samiksha", "support", "help", "official", "team", "staff", "root",
]);

/** Accepts "amazon.in/x" as well as full links, and refuses anything but http(s). */
export function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
    if (!url.hostname.includes(".") && url.hostname !== "localhost") throw new Error("bad host");
    return url.toString();
  } catch {
    throw new Error("invalid url");
  }
}

const optionalUrl = (message: string) =>
  z
    .string()
    .max(2000, message)
    .transform((value, ctx) => {
      try {
        return normalizeUrl(value);
      } catch {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
    });

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, "Use 3–30 letters, numbers or underscores.")
  .refine((name) => !RESERVED_USERNAMES.has(name), "That username isn't available.")
  .refine((name) => !/^user_[0-9a-f]{12}$/.test(name), "Please choose your own username.");

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(80),
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: passwordSchema,
});

export const emailSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
});

export const newPasswordSchema = z.object({ password: passwordSchema });

const optionalMonthDay = z
  .object({
    birthday_month: z.string().optional(),
    birthday_day: z.string().optional(),
  })
  .transform(({ birthday_month, birthday_day }, ctx) => {
    const month = birthday_month ? Number(birthday_month) : null;
    const day = birthday_day ? Number(birthday_day) : null;
    if (month === null && day === null) return { birthday_month: null, birthday_day: null };
    // 2024 is a leap year, so 29 February is allowed.
    const valid =
      month !== null && day !== null &&
      Number.isInteger(month) && Number.isInteger(day) &&
      month >= 1 && month <= 12 && day >= 1 &&
      day <= new Date(Date.UTC(2024, month, 0)).getUTCDate();
    if (!valid) {
      ctx.addIssue({ code: "custom", message: "Choose a real date, or leave both blank." });
      return z.NEVER;
    }
    return { birthday_month: month, birthday_day: day };
  });

export const onboardingSchema = z
  .object({
    username: usernameSchema,
    full_name: z.string().trim().min(1, "Enter your name.").max(80),
  })
  .and(optionalMonthDay);

export const profileSchema = z
  .object({
    username: usernameSchema,
    full_name: z.string().trim().min(1, "Enter your name.").max(80),
    bio: z.string().trim().max(300, "Keep your bio under 300 characters."),
    location: z.string().trim().max(80),
    website: optionalUrl("Enter a valid website link."),
    avatar_url: z.string().trim().max(2000),
  })
  .and(optionalMonthDay);

export const wishSchema = z.object({
  title: z.string().trim().min(1, "Give your wish a name.").max(120, "Keep the name under 120 characters."),
  description: z.string().trim().max(1000, "Keep the description under 1000 characters."),
  price_inr: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null;
      const price = Number(value.replace(/[,₹\s]/g, ""));
      if (!Number.isInteger(price) || price < 0 || price > 100_000_000) {
        ctx.addIssue({ code: "custom", message: "Enter a price in whole rupees." });
        return z.NEVER;
      }
      return price;
    }),
  product_url: optionalUrl("That link doesn't look right. Paste the full product link."),
  image_url: z.string().trim().max(2000),
  category: z.enum(CATEGORIES.map((c) => c.value) as [string, ...string[]]),
  priority: z.enum(["low", "medium", "high"]),
  visibility: z.enum(["public", "private"]),
  collection_id: z
    .string()
    .transform((value) => value || null)
    .pipe(z.uuid().nullable()),
});

export const collectionSchema = z.object({
  name: z.string().trim().min(1, "Give this collection a name.").max(80),
  occasion: z.enum(OCCASIONS.map((o) => o.value) as [string, ...string[]]),
  event_date: z
    .string()
    .transform((value) => value || null)
    .pipe(z.iso.date("Choose a valid date.").nullable()),
  is_public: z.preprocess((value) => value === "on", z.boolean()),
});

export const commentSchema = z.object({
  wish_id: z.uuid(),
  body: z.string().trim().min(1, "Write something first.").max(500, "Keep comments under 500 characters."),
});

export const reportSchema = z.object({
  target_type: z.enum(["wish", "comment", "profile"]),
  target_id: z.uuid(),
  reason: z.string().trim().min(1).max(500),
});

/** Only images we host for this user may be attached, never arbitrary URLs. */
export function isOwnImage(url: string, bucket: string, userId: string, base: string) {
  return url.startsWith(`${base}/storage/v1/object/public/${bucket}/${userId}/`);
}

/** First validation message, ready to show to the user. */
export const firstError = (error: z.ZodError) => error.issues[0]?.message ?? "Please check the form.";

/** Strips characters that have meaning in PostgREST filters. */
export const sanitizeSearch = (query: string) =>
  query.replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
