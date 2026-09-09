"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  initializePaddle,
  type Paddle,
  type PricePreviewParams,
  type PricePreviewResponse,
} from "@paddle/paddle-js";
import { Check, Loader2, AlertCircle } from "lucide-react";

export interface Tier {
  name: "Starter" | "Pro" | "Advanced";
  description: string;
  features: string[];
  priceId: { month: string; year: string };
}

// Every tier gets the same feature set today (captions, styling, translation,
// voiceover, 1080x1920 exports) — the only real differentiator is the
// monthly processing budget. Keep these numbers in sync with
// CREDITS_PER_MONTH in apps/api/app/services/subscriptions.py (credits are
// 1/sec of source video for captions-only, 2/sec with AI voiceover, so the
// figure below is the captions-only ceiling).
const TIERS: Tier[] = [
  {
    name: "Starter",
    description: "For creators getting started with short-form content.",
    features: [
      "Up to 100 min of video/month",
      "AI captions with full style customization",
      "Multi-language translation & AI voiceover",
      "1080×1920 vertical exports",
      "Email support",
    ],
    priceId: { month: "", year: "" },
  },
  {
    name: "Pro",
    description: "For growing channels that need more power and flexibility.",
    features: [
      "Up to 250 min of video/month",
      "AI captions with full style customization",
      "Multi-language translation & AI voiceover",
      "1080×1920 vertical exports",
      "Priority email support",
    ],
    priceId: { month: "", year: "" },
  },
  {
    name: "Advanced",
    description: "For teams and agencies producing at scale.",
    features: [
      "Up to 600 min of video/month",
      "AI captions with full style customization",
      "Multi-language translation & AI voiceover",
      "1080×1920 vertical exports",
      "Priority support",
    ],
    priceId: { month: "", year: "" },
  },
];

interface PricingCardsProps {
  priceIds: {
    starter: { month: string; year: string };
    pro: { month: string; year: string };
    advanced: { month: string; year: string };
  };
  environment: "sandbox" | "live";
  clientToken: string;
  country: string | null;
  email: string | null;
}

type PriceMap = Record<
  string,
  { total: string; currencyCode: string } | undefined
>;

export function PricingCards({
  priceIds,
  environment,
  clientToken,
  country,
  email,
}: PricingCardsProps) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [prices, setPrices] = useState<PriceMap>({});
  const [billing, setBilling] = useState<"month" | "year">("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const tierList = useMemo(
    () =>
      TIERS.map((tier, index) => {
        const ids =
          index === 0
            ? priceIds.starter
            : index === 1
              ? priceIds.pro
              : priceIds.advanced;
        return { ...tier, priceId: ids };
      }),
    [priceIds]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const instance = await initializePaddle({
          token: clientToken,
          environment: environment === "live" ? "production" : "sandbox",
        });
        if (cancelled) return;
        if (!instance) {
          throw new Error("Failed to initialize Paddle");
        }
        setPaddle(instance);

        const items = [
          ...Object.values(priceIds.starter),
          ...Object.values(priceIds.pro),
          ...Object.values(priceIds.advanced),
        ].map((priceId) => ({ priceId, quantity: 1 }));

        const previewParams: PricePreviewParams = { items };
        if (country) {
          previewParams.address = { countryCode: country };
        }

        const response: PricePreviewResponse = await instance.PricePreview(
          previewParams
        );
        if (cancelled) return;

        const nextPrices: PriceMap = {};
        response.data.details.lineItems.forEach((item) => {
          nextPrices[item.price.id] = {
            total: item.formattedTotals.total,
            currencyCode: response.data.currencyCode,
          };
        });
        setPrices(nextPrices);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load prices");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [clientToken, environment, country, priceIds]);

  const openCheckout = useCallback(
    (_tierName: string, priceId: string) => {
      if (!paddle || !priceId) return;
      setCheckoutLoading(priceId);
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: `${window.location.origin}/welcome`,
        },
        customer: email ? { email } : undefined,
      });
      setCheckoutLoading(null);
    },
    [paddle, email]
  );

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="animate-float-b absolute -left-16 top-8 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl dark:bg-blue-500/10" />
        <div className="animate-float-a absolute right-0 top-24 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl dark:bg-purple-500/10" />
        <div className="animate-float-c absolute left-1/3 bottom-0 h-56 w-56 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            Choose the plan that fits your workflow. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
            <button
              type="button"
              onClick={() => setBilling("month")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                billing === "month"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("year")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                billing === "year"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tierList.map((tier) => {
            const priceId = tier.priceId[billing];
            const price = prices[priceId];
            const isLoading = loading || !price;
            const isCheckoutLoading = checkoutLoading === priceId;

            return (
              <div
                key={tier.name}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {tier.description}
                </p>
                <div className="mt-4 min-h-[3.5rem]">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  ) : (
                    <div className="text-3xl font-bold">{price?.total}</div>
                  )}
                  <p className="text-sm text-zinc-500">
                    per {billing === "month" ? "month" : "year"}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500" />
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => openCheckout(tier.name, priceId)}
                  disabled={isLoading || isCheckoutLoading || !paddle}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  {isCheckoutLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Subscribe
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
