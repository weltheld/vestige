import { PublicHeader } from "@vestige/ui";
import { SignUpForm } from "@/components/SignUpForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next && next.startsWith("/") ? next : "/app";

  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader />
      <main className="flex flex-1 items-start justify-center px-6 py-20">
        <div className="w-full max-w-[520px] rounded-2xl bg-surface p-10 shadow-[0_8px_32px_-8px_rgba(43,33,24,0.18)]">
          <SignUpForm next={target} />
        </div>
      </main>
    </div>
  );
}
