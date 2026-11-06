import type { Metadata } from "next";
import { PasswordForm } from "@/components/auth-forms";
import { DeleteAccountForm, ProfileForm } from "@/components/profile-forms";
import { Button, Card, PageHeader } from "@/components/ui";
import { logout } from "@/lib/actions/auth";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireViewer();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-5">
        <Card className="p-5">
          <h2 className="mb-4 text-xl font-semibold">Profile</h2>
          <ProfileForm profile={viewer.profile} />
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-xl font-semibold">Account</h2>
          <p className="text-muted">Signed in as {viewer.email}</p>
          <PasswordForm />
          <form action={logout} className="border-t border-line pt-4">
            <Button variant="secondary" type="submit">Log out</Button>
          </form>
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-xl font-semibold">Delete account</h2>
          <p className="text-muted">
            This permanently removes your profile, wishes, photos and comments. It can&apos;t be undone.
          </p>
          <DeleteAccountForm />
        </Card>
      </div>
    </>
  );
}
