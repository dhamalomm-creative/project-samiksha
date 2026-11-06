import { LinkButton, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 text-center">
      <div>
        <Logo />
        <h1 className="mt-6 text-3xl font-semibold">We couldn&apos;t find that</h1>
        <p className="mt-2 text-muted">It may have been removed, or it may be private.</p>
        <LinkButton href="/" className="mt-6">Go home</LinkButton>
      </div>
    </main>
  );
}
