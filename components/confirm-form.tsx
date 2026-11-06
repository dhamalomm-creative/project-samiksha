"use client";

import type { FormEvent } from "react";
import { SubmitButton } from "./form-bits";

export function ConfirmForm({
  action,
  message,
  label,
}: {
  action: () => Promise<void>;
  message: string;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event: FormEvent) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <SubmitButton variant="danger">{label}</SubmitButton>
    </form>
  );
}
