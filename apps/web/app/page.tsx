import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";
import { DemoClips } from "@/components/demo-clips";
import { FloatingOrbs } from "@/components/floating-orbs";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Scissors,
  Subtitles,
  Globe,
  Wand2,
  Download,
  Sparkles,
  Check,
  Zap,
  Crown,
} from "lucide-react";

const features = [
  {
    icon: Scissors,
    title: "Auto-crop to vertical",
    description:
      "Upload any 16:9 video and get 9:16 clips tuned for TikTok, Reels, and Shorts.",
  },
  {
    icon: Subtitles,
    title: "Burned-in captions",
    description:
      "Auto-transcribe and style captions with custom fonts, colors, and positioning.",
  },
  {
    icon: Globe,
    title: "Translate & dub",
    description:
      "Reach global audiences by translating captions and generating AI voiceovers.",
  },
  {
    icon: Wand2,
    title: "AI clip scoring",
    description:
      "We analyze your video and surface the most engaging moments to clip.",
  },
  {
    icon: Download,
    title: "One-click export",
    description: "Preview, edit timings, and download ready-to-post clips.",
  },
  {
    icon: Sparkles,
    title: "Credit-based pricing",
    description: "Start free, upgrade when you need more processing power.",
  },
];

const steps = [
  { step: "1", title: "Upload", description: "Drop in your long-form video." },
  { step: "2", title: "Customize", description: "Pick language, captions, and voiceover style." },
  { step: "3", title: "Publish", description: "Download vertical clips and post everywhere." },
];

// Keep in sync with components/pricing-cards.tsx TIERS and
// apps/api/app/services/subscriptions.py (CREDITS_PER_MONTH / TIER_PRICES).
const pricingTeaser = [
  {
    name: "Starter",
    icon: Zap,
    price: "$10",
    period: "/month",
    description: "Perfect for solo creators trying short-form.",
    features: ["Up to 100 min of video/month", "AI captions & styling", "Email support"],
  },
  {
    name: "Pro",
    icon: Crown,
    price: "$25",
    period: "/month",
    description: "For growing channels that need more power.",
    features: ["Up to 250 min of video/month", "Multi-language voiceover", "Priority email support"],
  },
  {
    name: "Advanced",
    icon: Sparkles,
    price: "$60",
    period: "/month",
    description: "For teams and agencies producing at scale.",
    features: ["Up to 600 min of video/month", "Multi-language voiceover", "Priority support"],
  },
];

const floatClasses = ["animate-float-a", "animate-float-b", "animate-float-c"];

const trustBadges = [
  "No credit card required to try",
  "Cancel anytime",
  "7-day free trial on every plan",
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black sm:px-6 sm:py-4">
        <span className="text-lg font-semibold">ClipForge</span>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/pricing"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Pricing
          </Link>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:px-4">
                Sign in
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:px-4"
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-28">
          <FloatingOrbs />
          <div className="mx-auto max-w-3xl">
            <div className="animate-float-c inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              <Sparkles className="h-3.5 w-3.5" />
              Now live — start creating clips today
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Turn long videos into short-form gold.
            </h1>
            <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
              ClipForge auto-detects, crops, captions, and dubs vertical clips
              ready for TikTok, Reels, and YouTube Shorts.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                    Get started free
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Go to dashboard
                </Link>
              </Show>
              <Link
                href="/pricing"
                className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-base font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-black dark:text-white dark:hover:bg-zinc-900"
              >
                See pricing
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
              {trustBadges.map((badge) => (
                <span key={badge} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Demo clips: renders nothing (including no heading) until at
            least one clip has been explicitly opted into the public demo. */}
        <DemoClips />

        {/* How it works */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">How it works</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-lg font-bold text-white dark:bg-white dark:text-black">
                    {item.step}
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">
              Everything you need to repurpose video
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <feature.icon
                    className={`h-8 w-8 text-zinc-900 dark:text-white ${floatClasses[i % floatClasses.length]}`}
                    style={{ animationDelay: `${(i % 3) * 0.7}s` }}
                  />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="border-y border-zinc-200 bg-zinc-50 px-4 py-16 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-semibold sm:text-3xl">Simple pricing</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-zinc-600 dark:text-zinc-400">
              Start free, then upgrade when you need more videos and higher quality exports.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pricingTeaser.map((tier, i) => (
                <div
                  key={tier.name}
                  className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-center gap-2">
                    <tier.icon
                      className={`h-5 w-5 text-zinc-500 ${floatClasses[i % floatClasses.length]}`}
                      style={{ animationDelay: `${(i % 3) * 0.7}s` }}
                    />
                    <h3 className="font-semibold">{tier.name}</h3>
                  </div>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    <span className="text-sm text-zinc-500">{tier.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {tier.description}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/pricing"
                className="rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                View full pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Waitlist CTA */}
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl rounded-3xl bg-zinc-900 px-6 py-12 text-center text-white dark:bg-white dark:text-black">
            <h2 className="text-2xl font-semibold sm:text-3xl">Want early updates?</h2>
            <p className="mt-4 text-zinc-300 dark:text-zinc-600">
              Join the waitlist for product updates, new features, and tips on growing with short-form video.
            </p>
            <div className="mx-auto mt-8 max-w-md">
              <WaitlistForm source="footer" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 sm:px-6">
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
          <span>© {new Date().getFullYear()} ClipForge</span>
          <Link
            href="/docs/api"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            API docs
          </Link>
          <Link
            href="/pricing"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Pricing
          </Link>
          <Link
            href="/terms"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Privacy
          </Link>
          <Link
            href="/refund-policy"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Refunds
          </Link>
          <a
            href="mailto:support@clickforg.com"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
