import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles,
  UserRound,
  VenetianMask,
  Download,
  Bot,
  Mic,
  Wand2,
  Link2,
  ScrollText,
  ShieldCheck,
  KeyRound,
  Library,
} from "lucide-react";
import { PublicHeader } from "@vestige/ui";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Getting started — Vestige Campaign",
  description:
    "From creating your Vestige Campaign account to your first auto-written session recap: set up the Familiar desktop app, connect it to your Journal, and record your next D&D session.",
};

const FAMILIAR_URL = "https://dnd-recap-bot.vercel.app";

export default function GettingStartedPage() {
  return (
    <div className="flex min-h-screen flex-col bg-parchment">
      <PublicHeader />

      {/* Hero */}
      <section className="flex flex-col items-center gap-6 px-6 pb-14 pt-20 text-center sm:px-12">
        <p className="flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          <Sparkles size={14} /> Getting started
        </p>
        <h1 className="max-w-[760px] font-display text-4xl font-semibold tracking-[0.02em] text-ink sm:text-5xl">
          From download to your first written recap
        </h1>
        <p className="max-w-[640px] font-body text-lg leading-[1.7] text-ink-soft">
          This guide walks you through everything once: create your campaign on
          Vestige Campaign, set up the <strong className="text-ink">Familiar</strong> desktop
          app, connect the two — and after your next session, a structured recap
          appears in your Journal on its own.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 font-body text-[13px] text-muted">
          <span>Familiar is a free desktop app for</span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            macOS
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-2 py-1 font-display text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            Windows
          </span>
        </div>
      </section>

      {/* Phases */}
      <div className="mx-auto w-full max-w-[760px] px-5 pb-24 sm:px-8">
        <Phase n="I" title="Set up Vestige Campaign" Icon={UserRound}>
          <Step n={1} title="Create your account">
            <p>
              Go to <Href href="/signup">vestige-web-pi.vercel.app/signup</Href> and enter your
              email. There is no password — Vestige Campaign sends you a <em>magic link</em>. Open the mail
              (check spam the first time) and click the link; you&rsquo;re signed in.
            </p>
          </Step>
          <Step n={2} title="Create your campaign">
            <p>
              On your home screen, click{" "}
              <UiRef>
                <VenetianMask size={12} className="text-gold" /> Host a new campaign
              </UiRef>{" "}
              and follow the short wizard — name your campaign, pick a banner, done. You are the
              campaign&rsquo;s owner (DM).
            </p>
          </Step>
          <Step n={3} title="Invite your party (optional, any time)">
            <p>
              Open your campaign&rsquo;s <strong>Settings → Players &amp; Invites</strong>. You can
              share a <em>magic link</em>, send <em>email invites</em>, or give players the short{" "}
              <em>join code</em> they can redeem on their own home screen. Players see the Calendar,
              Journal, and Codex of every campaign they&rsquo;re in.
            </p>
          </Step>
        </Phase>

        <Phase n="II" title="Install Familiar" Icon={Download}>
          <Step n={4} title="Download and install">
            <p>
              Get Familiar for <strong>Windows</strong> or <strong>macOS</strong> at{" "}
              <Href href={FAMILIAR_URL} external>
                dnd-recap-bot.vercel.app
              </Href>
              . Install and open it — a setup wizard starts and takes about 10 minutes.
            </p>
            <Callout>
              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                You&rsquo;ll need
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                <li>· A free Discord account (you&rsquo;ll create a bot in step 5)</li>
                <li>· Python 3.10+ (for the local transcription engine)</li>
                <li>
                  · Optional: an NVIDIA GPU with CUDA for fast transcription — CPU works everywhere,
                  just slower
                </li>
                <li>· Either Ollama (free, local) or an Anthropic API key for the recap writing</li>
              </ul>
            </Callout>
            <p>
              Everything Familiar records and transcribes <strong>stays on your computer</strong> —
              audio is never uploaded anywhere.
            </p>
          </Step>
        </Phase>

        <Phase n="III" title="Create your Discord bot" Icon={Bot}>
          <Step n={5} title="Register a bot application">
            <p>
              Familiar joins your voice channel through a Discord bot that belongs to <em>you</em>.
              Go to{" "}
              <Href href="https://discord.com/developers/applications" external>
                discord.com/developers/applications
              </Href>
              , choose <strong>Build a Bot</strong> (or <strong>New Application</strong>), and name
              it anything — &ldquo;Familiar&rdquo; works.
            </p>
          </Step>
          <Step n={6} title="Enable the intent and copy your token">
            <p>
              In the left sidebar open <strong>Bot</strong>, scroll to{" "}
              <strong>Privileged Gateway Intents</strong>, and enable{" "}
              <strong>Server Members Intent</strong>. Then click <strong>Reset Token</strong>,
              confirm, and copy the token.
            </p>
            <Callout tone="warn">
              Treat the bot token like a password — anyone who has it can control your bot. Familiar
              stores it only on your PC.
            </Callout>
            <p>
              Also copy the <strong>Application ID</strong> from the{" "}
              <strong>General Information</strong> page. Optionally copy your{" "}
              <strong>Server ID</strong> too (enable <em>Developer Mode</em> in Discord&rsquo;s
              settings, then right-click your server → <em>Copy Server ID</em>) — it makes the
              bot&rsquo;s slash commands register instantly.
            </p>
          </Step>
          <Step n={7} title="Invite the bot to your server">
            <p>
              Open this URL with your own Application ID filled in, pick your D&amp;D server, and
              authorize:
            </p>
            <Code>
              https://discord.com/oauth2/authorize?client_id=
              <strong>YOUR_APPLICATION_ID</strong>&amp;scope=bot+applications.commands&amp;permissions=34655232
            </Code>
            <p>
              Back in Familiar&rsquo;s wizard, paste the <strong>bot token</strong>,{" "}
              <strong>Application ID</strong>, and <strong>Server ID</strong>.
            </p>
          </Step>
        </Phase>

        <Phase n="IV" title="Transcription & recap writing" Icon={Wand2}>
          <Step n={8} title="Choose how audio becomes text">
            <p>
              The wizard checks your Python install, then asks how to run{" "}
              <em>faster-whisper</em>, the local transcription engine:
            </p>
            <ul className="flex flex-col gap-1.5">
              <li>
                · <strong>CPU</strong> — works on every machine, roughly 3–5× slower.
              </li>
              <li>
                · <strong>GPU (CUDA)</strong> — much faster; needs an NVIDIA GPU plus a one-time
                install of the CUDA Toolkit 12 and cuDNN 9, then a restart. Familiar falls back to
                CPU automatically if the GPU isn&rsquo;t ready.
              </li>
            </ul>
            <p>
              Pick a Whisper model: <strong>small</strong> (fastest, good for CPU),{" "}
              <strong>medium</strong> (recommended on GPU), or <strong>large-v3</strong> (best
              quality, 10+ GB VRAM). You can change this later in Familiar&rsquo;s settings.
            </p>
          </Step>
          <Step n={9} title="Choose who writes the recap">
            <p>After transcription, an AI model turns the transcript into a structured recap:</p>
            <ul className="flex flex-col gap-1.5">
              <li>
                · <strong>Ollama — free &amp; private.</strong> Install the{" "}
                <Href href="https://ollama.com" external>
                  Ollama app
                </Href>
                , then download a model right inside Familiar&rsquo;s wizard (e.g.{" "}
                <em>llama3.1</em>, ~4.7 GB) and select it. Nothing leaves your computer.
              </li>
              <li>
                · <strong>Claude (Anthropic) — best quality.</strong> Create a key at{" "}
                <Href href="https://console.anthropic.com" external>
                  console.anthropic.com
                </Href>{" "}
                and paste it in. Costs roughly $0.10–0.50 per session; usage is logged per session.
              </li>
            </ul>
            <p>You can switch between the two any time in Familiar&rsquo;s settings.</p>
          </Step>
        </Phase>

        <Phase n="V" title="Connect Familiar to your Journal" Icon={Link2}>
          <Step n={10} title="Create the campaign in Familiar">
            <p>
              When the wizard finishes, Familiar&rsquo;s dashboard opens. Create your campaign there
              (sessions are grouped by campaign), pick your <strong>voice channel</strong>, and map
              each Discord user to their <strong>character name</strong> — the recap will speak of
              Yasha, not of <em>user_4711</em>.
            </p>
          </Step>
          <Step n={11} title="Copy the connection from Vestige Campaign">
            <p>
              In Vestige Campaign, open your campaign&rsquo;s <strong>Settings → Familiar</strong> tab. It
              shows two values: the <strong>Endpoint URL</strong> and this campaign&rsquo;s{" "}
              <strong>Ingest token</strong>{" "}
              <KeyRound size={12} className="inline text-gold" aria-hidden />. Copy both.
            </p>
          </Step>
          <Step n={12} title="Paste and connect">
            <p>
              In Familiar, open <strong>Settings → Vestige</strong>, select the campaign, paste the{" "}
              <strong>Endpoint URL</strong> and <strong>Ingest token</strong>, and click{" "}
              <strong>Connect</strong>. Familiar pings your Journal once — back in Vestige Campaign, the
              Familiar card now shows <em>Verified</em>. Every finished recap will be delivered
              automatically from now on.
            </p>
          </Step>
        </Phase>

        <Phase n="VI" title="Game night" Icon={Mic}>
          <Step n={13} title="Record the session">
            <p>
              Everyone joins the voice channel as usual. In Familiar, hit{" "}
              <UiRef>● Start recording</UiRef>. Each player confirms a one-time{" "}
              <strong>consent</strong> prompt in Discord (remembered per campaign) —{" "}
              <ShieldCheck size={12} className="inline text-gold" aria-hidden /> only consenting
              players are recorded, each on their own track. Play your session; when you&rsquo;re
              done, hit <UiRef>■ Stop recording</UiRef>.
            </p>
          </Step>
          <Step n={14} title="Let Familiar work">
            <p>
              Familiar transcribes the audio locally (a progress bar keeps you company — a long
              session takes a while on CPU), merges everyone&rsquo;s words into one speaker-tagged
              transcript, and writes the structured recap: summary, players, NPCs, loot, quests,
              cliffhangers.
            </p>
          </Step>
          <Step n={15} title="Open your Journal">
            <p>
              The recap arrives in your Vestige Campaign <strong>Journal</strong> as a new session — summary
              and notes filled in, notable people, places, and events seeded into the{" "}
              <strong>Codex</strong>{" "}
              <Library size={12} className="inline text-gold" aria-hidden />. Read it, edit
              anything, let your party annotate — and use{" "}
              <UiRef>
                <ScrollText size={11} className="text-gold" /> Add to Codex
              </UiRef>{" "}
              on any session to extract more entities on demand.
            </p>
          </Step>
        </Phase>

        {/* Closing CTA */}
        <div className="mt-14 flex flex-col items-center gap-4 rounded-2xl border border-hairline bg-cod-soft px-6 py-10 text-center">
          <h2 className="font-display text-2xl font-semibold text-ink">
            That&rsquo;s the whole ritual
          </h2>
          <p className="max-w-[520px] font-body text-[15px] leading-[1.7] text-ink-soft">
            Set up once, then every session simply appears in your chronicle. If something
            doesn&rsquo;t work, the Familiar dashboard shows the status of every stage — Discord,
            transcription, recap, and the Vestige Campaign connection.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="flex h-11 items-center justify-center rounded-lg bg-wine px-7 font-display text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              Join Vestige Campaign
            </Link>
            <a
              href={FAMILIAR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-hairline px-6 font-display text-[11px] font-semibold uppercase tracking-[0.08em] text-ink transition hover:border-gold"
            >
              <Download size={13} className="text-gold" />
              Get Familiar
            </a>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

/* ── building blocks ─────────────────────────────────────────────── */

function Phase({
  n,
  title,
  Icon,
  children,
}: {
  n: string;
  title: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-wine text-parchment">
          <Icon size={16} />
        </span>
        <div>
          <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
            Part {n}
          </p>
          <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        </div>
      </div>
      <ol className="flex flex-col gap-4">{children}</ol>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 rounded-xl border border-hairline bg-surface p-5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--gold)_60%,var(--surface))] font-display text-[12px] font-bold text-gold">
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5 pt-0.5">
        <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
        <div className="flex flex-col gap-2.5 font-body text-[14px] leading-[1.7] text-ink-soft [&_strong]:text-ink [&_em]:text-ink">
          {children}
        </div>
      </div>
    </li>
  );
}

function Callout({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  return (
    <div
      className={`rounded-lg border px-3.5 py-3 font-body text-[13px] leading-[1.6] ${
        tone === "warn"
          ? "border-[color-mix(in_srgb,var(--vote-no)_40%,var(--surface))] bg-[color-mix(in_srgb,var(--vote-no)_10%,var(--surface))] text-ink-soft"
          : "border-hairline bg-cod-soft text-ink-soft"
      }`}
    >
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <p className="overflow-x-auto rounded-lg border border-hairline bg-cod-soft px-3.5 py-3 font-mono text-[12px] leading-[1.6] text-ink [&_strong]:text-wine">
      {children}
    </p>
  );
}

function UiRef({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-cod-soft px-2 py-0.5 align-[-2px] font-display text-[11px] font-semibold text-ink">
      {children}
    </span>
  );
}

function Href({
  href,
  external = false,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-wine underline decoration-[color-mix(in_srgb,var(--wine)_40%,transparent)] underline-offset-2 hover:decoration-wine"
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="text-wine underline decoration-[color-mix(in_srgb,var(--wine)_40%,transparent)] underline-offset-2 hover:decoration-wine"
    >
      {children}
    </Link>
  );
}
