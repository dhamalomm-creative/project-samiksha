import type { Metadata } from "next";
import Link from "next/link";
import { GoogleButton, LoginForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/paths";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const destination = safeNext(next);

  return (
    <>
      <h1 className="mb-5 text-center text-2xl font-semibold">Welcome back</h1>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-vermilion/10 px-3.5 py-2.5 text-sm font-medium text-vermilion-dark">
          That sign-in link didn&apos;t work. Please try again.
        </p>
      )}
      <GoogleButton next={destination} />
      <LoginForm next={destination} />
      <p className="mt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-ink underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
