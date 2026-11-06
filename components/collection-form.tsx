"use client";

import { OCCASIONS } from "@/lib/constants";
import type { ActionResult, Collection } from "@/lib/types";
import { FormMessage, SubmitButton, useActionForm } from "./form-bits";
import { Field, Input, Select } from "./ui";

export function CollectionForm({
  action,
  collection,
}: {
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>;
  collection?: Collection;
}) {
  const { state, formProps, pending } = useActionForm(action);

  return (
    <form {...formProps} className="space-y-4">
      <Field label="Name">
        <Input name="name" defaultValue={collection?.name} required maxLength={80} placeholder="My 30th birthday" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Occasion">
          <Select name="occasion" defaultValue={collection?.occasion ?? "birthday"}>
            {OCCASIONS.map((occasion) => (
              <option key={occasion.value} value={occasion.value}>
                {occasion.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date (optional)">
          <Input name="event_date" type="date" defaultValue={collection?.event_date ?? ""} />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={collection?.is_public ?? true}
          className="size-5 accent-vermilion"
        />
        Anyone with the link can see this collection
      </label>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>{collection ? "Save collection" : "Create collection"}</SubmitButton>
    </form>
  );
}
