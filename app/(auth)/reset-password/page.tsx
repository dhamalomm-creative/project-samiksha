import type { Metadata } from "next";
import Link from "next/link";
import { PasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="mb-5 text-center text-2xl font-semibold">Choose a new password</h1>
      <PasswordForm cta="Save password" />
      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/home" className="font-semibold text-ink underline">
          Continue to Samiksha
        </Link>
      </p>
    </>
  );
}
