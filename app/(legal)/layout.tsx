import type { ReactNode } from "react";
import { Logo } from "@/components/ui";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Logo />
      <main className="mt-8 space-y-4 [&_h1]:text-4xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted [&_ul]:space-y-1 [&_ul]:text-muted">
        {children}
      </main>
    </div>
  );
}
