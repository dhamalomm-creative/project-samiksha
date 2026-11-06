import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>This policy explains what Samiksha collects, why, and the choices you have.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Your name, email address and password (stored encrypted), or your Google account basics if you sign in with Google.</li>
        <li>What you add: your profile, wishes, photos, collections, comments and likes.</li>
        <li>Your birthday day and month, only if you choose to add it.</li>
        <li>Who you follow, and which gifts you reserve.</li>
      </ul>

      <h2>Who can see what</h2>
      <ul>
        <li>Your profile, public wishes and public collections can be seen by anyone, including people without an account.</li>
        <li>Private wishes are visible only to you.</li>
        <li>Your birthday is visible only to logged-in members.</li>
        <li>Gifts you reserve are never shown to the person you are gifting. Others only see that a gift is taken, not who took it.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to run Samiksha: showing your list, notifying you of activity and keeping the service
        safe. We do not sell your personal data.
      </p>

      <h2>Service providers</h2>
      <p>
        We use Supabase for data storage and login, and Vercel for hosting. Links to stores take
        you to those stores, whose own privacy policies apply.
      </p>

      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you logged in. We do not use advertising cookies.</p>

      <h2>Your choices</h2>
      <p>
        You can correct your data in Settings, and delete your account there at any time, which
        removes your profile, wishes, photos and comments.
      </p>

      <h2>Contact</h2>
      <p>Questions or grievances: {contact ?? "contact details coming soon"}.</p>
    </>
  );
}
