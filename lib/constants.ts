export const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "fashion", label: "Fashion" },
  { value: "home", label: "Home" },
  { value: "books", label: "Books" },
  { value: "beauty", label: "Beauty" },
  { value: "toys", label: "Toys & Games" },
  { value: "sports", label: "Sports" },
  { value: "travel", label: "Travel" },
  { value: "experiences", label: "Experiences" },
  { value: "other", label: "Other" },
] as const;

export const OCCASIONS = [
  { value: "general", label: "Just because" },
  { value: "birthday", label: "Birthday" },
  { value: "wedding", label: "Wedding" },
  { value: "anniversary", label: "Anniversary" },
  { value: "baby", label: "New baby" },
  { value: "housewarming", label: "Housewarming" },
  { value: "festival", label: "Festival" },
  { value: "graduation", label: "Graduation" },
] as const;

export const PRIORITIES = [
  { value: "high", label: "Really want this" },
  { value: "medium", label: "Would love it" },
  { value: "low", label: "Nice to have" },
] as const;

export const REPORT_REASONS = [
  "Spam or scam",
  "Offensive content",
  "Harassment",
  "Pretending to be someone",
  "Something else",
] as const;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const PAGE_SIZE = 24;

export const labelFor = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((item) => item.value === value)?.label ?? value;
