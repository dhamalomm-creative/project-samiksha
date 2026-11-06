import type { ReactNode } from "react";
import { Card, Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo className="text-3xl" />
        </div>
        <Card className="p-6 sm:p-8">{children}</Card>
      </div>
    </main>
  );
}
