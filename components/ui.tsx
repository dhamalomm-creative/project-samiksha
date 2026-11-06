import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { displayName } from "@/lib/format";

const VARIANTS = {
  primary: "bg-vermilion text-white hover:bg-vermilion-dark",
  secondary: "border border-line bg-card text-ink hover:bg-sand",
  ghost: "text-muted hover:bg-sand hover:text-ink",
  danger: "border border-vermilion/30 bg-card text-vermilion hover:bg-vermilion/10",
};

export type ButtonVariant = keyof typeof VARIANTS;

export const buttonClass = (variant: ButtonVariant = "primary", className?: string) =>
  clsx(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    VARIANTS[variant],
    className,
  );

export function Button({
  variant,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}

export function LinkButton({
  variant,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}

const fieldClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-base outline-none transition placeholder:text-muted/70 focus:border-vermilion focus:ring-2 focus:ring-vermilion/15";

export const Input = ({ className, ...props }: ComponentProps<"input">) => (
  <input {...props} className={clsx(fieldClass, className)} />
);

export const Textarea = ({ className, ...props }: ComponentProps<"textarea">) => (
  <textarea {...props} className={clsx(fieldClass, className)} />
);

export const Select = ({ className, ...props }: ComponentProps<"select">) => (
  <select {...props} className={clsx(fieldClass, className)} />
);

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-muted">{hint}</span>}
    </label>
  );
}

const SIZES = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-24 text-3xl" };

export function Avatar({
  person,
  size = "md",
}: {
  person: { full_name: string; username: string; avatar_url: string | null };
  size?: keyof typeof SIZES;
}) {
  const classes = clsx("shrink-0 rounded-full", SIZES[size]);
  if (person.avatar_url) {
    return (
      <img
        src={person.avatar_url}
        alt=""
        referrerPolicy="no-referrer"
        className={clsx(classes, "object-cover")}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={clsx(classes, "grid place-items-center bg-marigold-soft font-semibold text-ink")}
    >
      {displayName(person).replace("@", "").charAt(0).toUpperCase()}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/60 px-6 py-14 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const Card = ({ className, ...props }: ComponentProps<"div">) => (
  <div {...props} className={clsx("rounded-2xl border border-line bg-card", className)} />
);

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={clsx("font-display text-2xl font-semibold tracking-tight", className)}>
      Samiksha<span className="text-marigold">.</span>
    </Link>
  );
}
