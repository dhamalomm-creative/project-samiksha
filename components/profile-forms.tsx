"use client";

import { useState, type FormEvent } from "react";
import { deleteAccount } from "@/lib/actions/auth";
import { completeOnboarding, updateProfile } from "@/lib/actions/profile";
import { MONTHS } from "@/lib/constants";
import type { Profile } from "@/lib/types";
import { FormMessage, SubmitButton, useActionForm } from "./form-bits";
import { ImageUpload } from "./image-upload";
import { Field, Input, Select, Textarea } from "./ui";

function BirthdayFields({ month, day }: { month?: number | null; day?: number | null }) {
  return (
    <div>
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Field label="Birthday (optional)">
          <Select name="birthday_month" defaultValue={month ?? ""}>
            <option value="">Month</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Day">
          <Select name="birthday_day" defaultValue={day ?? ""}>
            <option value="">Day</option>
            {Array.from({ length: 31 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {index + 1}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="mt-1.5 text-sm text-muted">
        Day and month only. Logged-in Samiksha members can see it, so friends remember.
      </p>
    </div>
  );
}

export function OnboardingForm({ fullName }: { fullName: string }) {
  const { state, formProps, pending } = useActionForm(completeOnboarding);
  const [username, setUsername] = useState("");

  return (
    <form {...formProps} className="space-y-4">
      <Field label="Your name">
        <Input name="full_name" defaultValue={fullName} required maxLength={80} />
      </Field>
      <Field label="Username" hint={`Your link will end in /u/${username || "yourname"}`}>
        <Input
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
          required
          minLength={3}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          pattern="[a-z0-9_]+"
          title="Letters, numbers and underscores"
        />
      </Field>
      <BirthdayFields />
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">Continue</SubmitButton>
    </form>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const { state, formProps, pending } = useActionForm(updateProfile);

  return (
    <form {...formProps} className="space-y-4">
      <ImageUpload
        name="avatar_url"
        bucket="avatars"
        userId={profile.id}
        defaultValue={profile.avatar_url}
        round
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input name="full_name" defaultValue={profile.full_name} required maxLength={80} />
        </Field>
        <Field label="Username">
          <Input name="username" defaultValue={profile.username} required maxLength={30} autoCapitalize="none" />
        </Field>
      </div>
      <Field label="Bio">
        <Textarea name="bio" defaultValue={profile.bio} rows={3} maxLength={300} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City">
          <Input name="location" defaultValue={profile.location} maxLength={80} />
        </Field>
        <Field label="Website">
          <Input name="website" defaultValue={profile.website ?? ""} inputMode="url" />
        </Field>
      </div>
      <BirthdayFields month={profile.birthday_month} day={profile.birthday_day} />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Save profile</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const { state, formProps, pending } = useActionForm(deleteAccount);

  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (window.confirm("This permanently deletes your account, wishes and photos. Continue?")) {
      formProps.onSubmit(event);
    }
  }

  return (
    <form {...formProps} onSubmit={confirmDelete} className="space-y-3">
      <Field label="Type DELETE to confirm">
        <Input name="confirm" autoComplete="off" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} variant="danger">Delete my account</SubmitButton>
    </form>
  );
}
