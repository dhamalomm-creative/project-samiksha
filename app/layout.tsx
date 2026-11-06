import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { siteUrl } from "@/lib/paths";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

const description = "Make a wishlist, share it with the people you love, and let them reserve gifts in secret.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Samiksha: wishlists for meaningful gifting", template: "%s · Samiksha" },
  description,
  applicationName: "Samiksha",
  openGraph: { type: "website", siteName: "Samiksha", description, locale: "en_IN" },
  twitter: { card: "summary" },
};

export const viewport: Viewport = { themeColor: "#faf6ee" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
