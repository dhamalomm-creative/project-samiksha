"use client";

import Link from "next/link";
import {
  login,
  loginWithGoogle,
  sendPasswordReset,
  signup,
  updatePassword,
} from "@/lib/actions/auth";
import { FormMessage, SubmitButton, useActionForm } from "./form-bits";
import { Field, Input } from "./ui";

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={loginWithGoogle}>
      <input type="hidden" name="next" value={next ?? ""} />
      <SubmitButton variant="secondary" className="w-full">
        Continue with Google
      </SubmitButton>
      <p className="my-4 text-center text-sm text-muted">or use your email</p>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { state, formProps, pending } = useActionForm(login);
  return (
    <form {...formProps} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="font-medium text-muted hover:text-ink">
          Forgot password?
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">Log in</SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const { state, formProps, pending } = useActionForm(signup);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form {...formProps} className="space-y-4">
      <Field label="Your name">
        <Input name="full_name" autoComplete="name" required maxLength={80} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        By signing up you agree to our{" "}
        <Link href="/terms" className="underline">Terms</Link> and{" "}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { state, formProps, pending } = useActionForm(sendPasswordReset);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form {...formProps} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="w-full">Send reset link</SubmitButton>
    </form>
  );
}

export function PasswordForm({ cta = "Update password" }: { cta?: string }) {
  const { state, formProps, pending } = useActionForm(updatePassword);
  return (
    <form {...formProps} className="space-y-4">
      <Field label="New password" hint="At least 8 characters.">
        <Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>{cta}</SubmitButton>
    </form>
  );
}
