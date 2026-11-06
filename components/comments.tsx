"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { addComment, deleteComment } from "@/lib/actions/social";
import { displayName, timeAgo } from "@/lib/format";
import type { Comment } from "@/lib/types";
import { FormMessage, SubmitButton, useActionForm } from "./form-bits";
import { Avatar, Textarea } from "./ui";
import { ReportButton } from "./wish-actions";

function CommentForm({ wishId }: { wishId: string }) {
  const { state, formProps, pending } = useActionForm(addComment);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} {...formProps} className="space-y-2">
      <input type="hidden" name="wish_id" value={wishId} />
      <Textarea name="body" rows={2} maxLength={500} required aria-label="Write a comment" placeholder="Write a comment" />
      <FormMessage state={{ error: state.error }} />
      <SubmitButton pending={pending} variant="secondary">Post comment</SubmitButton>
    </form>
  );
}

function DeleteComment({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Delete comment"
      onClick={() =>
        startTransition(async () => {
          const result = await deleteComment(id);
          if (result.error) toast.error(result.error);
        })
      }
      className="grid size-9 place-items-center rounded-lg text-muted hover:bg-sand hover:text-vermilion"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

export function Comments({
  wishId,
  ownerId,
  comments,
  viewerId,
}: {
  wishId: string;
  ownerId: string;
  comments: Comment[];
  viewerId: string | null;
}) {
  return (
    <section id="comments" className="scroll-mt-20">
      <h2 className="mb-4 text-xl font-semibold">
        {comments.length === 0 ? "Comments" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </h2>

      <ul className="mb-5 space-y-4">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-3">
            <Link href={`/u/${comment.author.username}`}>
              <Avatar person={comment.author} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <Link href={`/u/${comment.author.username}`} className="font-semibold hover:underline">
                  {displayName(comment.author)}
                </Link>{" "}
                <span className="text-muted">{timeAgo(comment.created_at)}</span>
              </p>
              <p className="whitespace-pre-wrap break-words">{comment.body}</p>
              {viewerId && viewerId !== comment.user_id && (
                <ReportButton targetType="comment" targetId={comment.id} />
              )}
            </div>
            {(viewerId === comment.user_id || viewerId === ownerId) && <DeleteComment id={comment.id} />}
          </li>
        ))}
      </ul>

      {viewerId ? (
        <CommentForm wishId={wishId} />
      ) : (
        <p className="text-muted">
          <Link href={`/login?next=/wish/${wishId}`} className="font-semibold text-ink underline">
            Log in
          </Link>{" "}
          to comment.
        </p>
      )}
    </section>
  );
}
