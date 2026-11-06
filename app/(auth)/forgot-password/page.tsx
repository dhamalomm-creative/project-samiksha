import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-5 text-center text-2xl font-semibold">Reset your password</h1>
      <ForgotPasswordForm />
      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-ink underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
