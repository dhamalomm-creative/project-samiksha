import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton, SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-5 text-center text-2xl font-semibold">Start your wishlist</h1>
      <GoogleButton next="/onboarding" />
      <SignupForm />
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline">
          Log in
        </Link>
      </p>
    </>
  );
}
