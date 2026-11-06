import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p>By using Samiksha you agree to these terms.</p>

      <h2>Your account</h2>
      <p>You must be at least 18, or use Samiksha with a parent or guardian&apos;s consent. Keep your login safe; you are responsible for activity on your account.</p>

      <h2>Your content</h2>
      <p>You own what you post, and you give us permission to display it so the service works. Don&apos;t post anything illegal, abusive, misleading, or that you don&apos;t have the right to share.</p>

      <h2>Gifts and purchases</h2>
      <p>Samiksha does not sell products or handle payments. Purchases happen on third-party stores. A reservation is a friendly signal, not a promise to buy, and we aren&apos;t responsible for products, prices or delivery.</p>

      <h2>Removing content</h2>
      <p>We may remove content or suspend accounts that break these terms. You can report content using the Report option.</p>

      <h2>The service</h2>
      <p>Samiksha is provided as it is, and may change or be unavailable at times. To the extent the law allows, we are not liable for indirect losses from using it.</p>

      <h2>Contact</h2>
      <p>{contact ?? "Contact details coming soon"}.</p>
    </>
  );
}
