import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/profile-forms";
import { Card, Logo } from "@/components/ui";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const { profile } = await requireViewer();
  if (profile.onboarded) redirect("/home");

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo className="text-3xl" />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Claim your link</h1>
          <p className="mb-5 mt-1 text-muted">This is the page you&apos;ll share with friends and family.</p>
          <OnboardingForm fullName={profile.full_name} />
        </Card>
      </div>
    </main>
  );
}
