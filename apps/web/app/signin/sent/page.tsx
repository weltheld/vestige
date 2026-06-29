import { MailCheck } from "lucide-react";
import { PublicHeader } from "@vestige/ui";
import { ResendLink } from "@/components/ResendLink";

export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/app";

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader />
      <main className="flex flex-1 items-start justify-center px-6 py-20">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-4 rounded-2xl bg-surface p-10 text-center shadow-[0_8px_32px_-8px_rgba(43,33,24,0.18)]">
          <MailCheck size={40} className="text-gold" />
          <h1 className="font-display text-[22px] text-wine">Check your inbox.</h1>
          <p className="max-w-[360px] font-body text-[15px] leading-[1.6] text-ink-soft">
            {email ? (
              <>
                We sent a sign-in link to <span className="text-ink">{email}</span>. Open
                it to enter Vestige.
              </>
            ) : (
              <>We sent you a sign-in link. Open it to enter Vestige.</>
            )}
          </p>
          <p className="font-body text-[11px] text-muted">
            The link is valid for 10 minutes.
          </p>
          <ResendLink email={email ?? ""} next={target} />
        </div>
      </main>
    </div>
  );
}
