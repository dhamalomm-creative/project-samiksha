"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useTransition, type ComponentProps, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/types";
import { Button } from "./ui";

type FormAction = (state: ActionResult, formData: FormData) => Promise<ActionResult>;

/**
 * Runs a server action from onSubmit, because letting <form action> handle it makes
 * React clear every field afterwards, wiping the input when validation fails.
 * `action` stays on the form so a submit before hydration still POSTs securely.
 */
export function useActionForm(action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, pending, formProps: { action: dispatch, onSubmit } };
}

export function SubmitButton({
  children,
  pending,
  ...props
}: ComponentProps<typeof Button> & { pending?: boolean }) {
  const status = useFormStatus();
  const busy = pending || status.pending;
  return (
    <Button type="submit" {...props} disabled={busy || props.disabled}>
      {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionResult }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl bg-vermilion/10 px-3.5 py-2.5 text-sm font-medium text-vermilion-dark">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-xl bg-leaf-soft px-3.5 py-2.5 text-sm font-medium text-leaf">
        {state.message}
      </p>
    );
  }
  return null;
}
