"use client";

import { CATEGORIES, PRIORITIES } from "@/lib/constants";
import type { ActionResult, Collection, Wish } from "@/lib/types";
import { FormMessage, SubmitButton, useActionForm } from "./form-bits";
import { ImageUpload } from "./image-upload";
import { Field, Input, Select, Textarea } from "./ui";

export function WishForm({
  action,
  userId,
  wish,
  collections,
  defaultCollection,
}: {
  action: (state: ActionResult, formData: FormData) => Promise<ActionResult>;
  userId: string;
  wish?: Wish;
  collections: Pick<Collection, "id" | "name">[];
  defaultCollection?: string;
}) {
  const { state, formProps, pending } = useActionForm(action);

  return (
    <form {...formProps} className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <ImageUpload
        name="image_url"
        bucket="wish-images"
        userId={userId}
        defaultValue={wish?.image_url}
      />

      <div className="space-y-4">
        <Field label="What do you wish for?">
          <Input name="title" defaultValue={wish?.title} required maxLength={120} placeholder="Kindle Paperwhite" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (₹)">
            <Input name="price_inr" inputMode="numeric" defaultValue={wish?.price_inr ?? ""} placeholder="14,999" />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue={wish?.category ?? "other"}>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Where to buy it" hint="Paste a link from Amazon, Flipkart, Myntra or any store.">
          <Input name="product_url" defaultValue={wish?.product_url ?? ""} inputMode="url" placeholder="https://www.amazon.in/..." />
        </Field>

        <Field label="Anything your gifter should know?">
          <Textarea name="description" defaultValue={wish?.description} rows={3} maxLength={1000} placeholder="Size, colour, the model you want..." />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How much do you want it?">
            <Select name="priority" defaultValue={wish?.priority ?? "medium"}>
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Who can see it?">
            <Select name="visibility" defaultValue={wish?.visibility ?? "public"}>
              <option value="public">Everyone</option>
              <option value="private">Only me</option>
            </Select>
          </Field>
        </div>

        <Field label="Collection">
          <Select name="collection_id" defaultValue={wish?.collection_id ?? defaultCollection ?? ""}>
            <option value="">None</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </Select>
        </Field>

        <FormMessage state={state} />
        <SubmitButton pending={pending} className="w-full sm:w-auto">{wish ? "Save changes" : "Add wish"}</SubmitButton>
      </div>
    </form>
  );
}
