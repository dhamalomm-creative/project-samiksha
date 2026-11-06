"use client";

import { Bookmark, Check, Flag, Gift, Heart, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { clsx } from "clsx";
import {
  releaseReservation,
  reserveWish,
  setReceived,
  setReservationStatus,
} from "@/lib/actions/wishes";
import { reportContent, toggleFollow, toggleLike, toggleSave } from "@/lib/actions/social";
import { REPORT_REASONS } from "@/lib/constants";
import type { ActionResult, Reservation } from "@/lib/types";
import { Button, Select, buttonClass } from "./ui";

/** Sends logged-out visitors to log in, then back here. */
function useLoginRedirect() {
  const router = useRouter();
  return () =>
    router.push(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
}

export function LikeButton({
  wishId,
  liked,
  count,
  signedIn,
}: {
  wishId: string;
  liked: boolean;
  count: number;
  signedIn: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic({ liked, count });
  const [, startTransition] = useTransition();
  const toLogin = useLoginRedirect();

  function onClick() {
    if (!signedIn) return toLogin();
    const next = !optimistic.liked;
    startTransition(async () => {
      setOptimistic({ liked: next, count: optimistic.count + (next ? 1 : -1) });
      const result = await toggleLike(wishId, next);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? "Unlike" : "Like"}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted transition hover:text-vermilion"
    >
      <Heart
        className={clsx("size-5", optimistic.liked && "fill-vermilion text-vermilion")}
        aria-hidden
      />
      {optimistic.count > 0 && optimistic.count}
    </button>
  );
}

export function SaveButton({
  wishId,
  saved,
  signedIn,
}: {
  wishId: string;
  saved: boolean;
  signedIn: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();
  const toLogin = useLoginRedirect();

  function onClick() {
    if (!signedIn) return toLogin();
    startTransition(async () => {
      setOptimistic(!optimistic);
      const result = await toggleSave(wishId, !optimistic);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Remove from saved" : "Save"}
      className="inline-flex min-h-10 items-center rounded-lg px-2 text-muted transition hover:text-ink"
    >
      <Bookmark className={clsx("size-5", optimistic && "fill-ink text-ink")} aria-hidden />
    </button>
  );
}

export function FollowButton({
  profileId,
  following,
  signedIn,
}: {
  profileId: string;
  following: boolean;
  signedIn: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(following);
  const [, startTransition] = useTransition();
  const toLogin = useLoginRedirect();

  function onClick() {
    if (!signedIn) return toLogin();
    startTransition(async () => {
      setOptimistic(!optimistic);
      const result = await toggleFollow(profileId, !optimistic);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <Button variant={optimistic ? "secondary" : "primary"} onClick={onClick}>
      {optimistic ? "Following" : "Follow"}
    </Button>
  );
}

export function ShareButton({ path, text }: { path: string; text: string }) {
  async function onClick() {
    const url = new URL(path, location.origin).toString();
    if (navigator.share) {
      // Dismissing the share sheet rejects, which isn't an error worth showing.
      await navigator.share({ title: "Samiksha", text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <Button type="button" variant="secondary" onClick={onClick}>
      <Share2 className="size-4" aria-hidden />
      Share
    </Button>
  );
}

function useAction() {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult>, success?: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else if (success) toast.success(success);
    });
  return { pending, run };
}

/** What a friend sees: the reservation controls for a wish that isn't theirs. */
export function ReservePanel({
  wishId,
  reservation,
  received,
  signedIn,
}: {
  wishId: string;
  reservation: Reservation | null;
  received: boolean;
  signedIn: boolean;
}) {
  const { pending, run } = useAction();
  const toLogin = useLoginRedirect();

  if (received) {
    return (
      <p className="rounded-xl bg-leaf-soft px-4 py-3 text-sm font-medium text-leaf">
        This wish already came true.
      </p>
    );
  }

  if (reservation?.mine) {
    const bought = reservation.status === "bought";
    return (
      <div className="space-y-3 rounded-xl bg-leaf-soft p-4">
        <p className="flex items-center gap-2 font-semibold text-leaf">
          <Check className="size-5" aria-hidden />
          {bought ? "You bought this gift" : "You reserved this gift"}
        </p>
        <p className="text-sm text-leaf">Your secret is safe. They can&apos;t see that it&apos;s you.</p>
        <div className="flex flex-wrap gap-2">
          {!bought && (
            <Button
              disabled={pending}
              onClick={() => run(() => setReservationStatus(wishId, "bought"), "Marked as bought")}
            >
              I&apos;ve bought it
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => releaseReservation(wishId), "Gift released")}
          >
            Release gift
          </Button>
        </div>
      </div>
    );
  }

  if (reservation) {
    return (
      <p className="rounded-xl bg-marigold-soft px-4 py-3 text-sm font-medium">
        Someone has already reserved this gift.
      </p>
    );
  }

  return (
    <div>
      <Button
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() =>
          signedIn ? run(() => reserveWish(wishId), "Reserved. It's your secret.") : toLogin()
        }
      >
        <Gift className="size-4" aria-hidden />
        I&apos;ll gift this
      </Button>
      <p className="mt-2 text-sm text-muted">
        Others will see it&apos;s taken. They won&apos;t see it&apos;s you, and neither will the wisher.
      </p>
    </div>
  );
}

export function ReceivedToggle({ wishId, received }: { wishId: string; received: boolean }) {
  const { pending, run } = useAction();
  return (
    <Button
      variant={received ? "secondary" : "primary"}
      disabled={pending}
      onClick={() => run(() => setReceived(wishId, !received))}
    >
      <Check className="size-4" aria-hidden />
      {received ? "Mark as not received" : "I got this"}
    </Button>
  );
}

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "wish" | "comment" | "profile";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const { pending, run } = useAction();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <Flag className="size-3.5" aria-hidden />
        Report
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Reason for report"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="w-auto py-1.5 text-sm"
      >
        {REPORT_REASONS.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </Select>
      <button
        type="button"
        disabled={pending}
        className={buttonClass("secondary", "min-h-9")}
        onClick={() => {
          run(
            () => reportContent({ target_type: targetType, target_id: targetId, reason }),
            "Thanks. We'll take a look.",
          );
          setOpen(false);
        }}
      >
        Send
      </button>
      <button type="button" className="text-sm text-muted" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
