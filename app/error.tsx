"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-5 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-muted">Please try again in a moment.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
