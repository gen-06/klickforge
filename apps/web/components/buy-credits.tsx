"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Coins, Loader2, Zap } from "lucide-react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { getCreditPacks, type CreditPack } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

function formatCredits(amount: number) {
  return amount.toLocaleString();
}

export function BuyCredits() {
  const { getToken, userId } = useAuth();
  const { error } = useToast();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const token = await getToken();
        const data = await getCreditPacks(token);
        if (!cancelled) setPacks(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;

    async function initPaddle() {
      const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      const env = process.env.NEXT_PUBLIC_PADDLE_ENV;
      if (!clientToken || !env) return;

      try {
        const instance = await initializePaddle({
          token: clientToken,
          environment: env === "live" ? "production" : "sandbox",
        });
        if (!cancelled && instance) {
          setPaddle(instance);
        }
      } catch (err) {
        console.error("Failed to initialize Paddle", err);
      }
    }

    initPaddle();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading credit packs...
      </div>
    );
  }

  if (packs.length === 0) {
    return null;
  }

  async function handleBuy(priceId: string) {
    if (!paddle || !userId) {
      error("Checkout is not ready. Please try again.");
      return;
    }

    setCheckoutLoading(priceId);
    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: `${window.location.origin}/dashboard`,
        },
      });
    } catch (err) {
      console.error(err);
      error("Failed to open checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-zinc-500" />
        <h3 className="font-semibold">Need more credits?</h3>
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Top up anytime — credits never expire.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {packs.map((pack) => (
          <button
            key={pack.price_id}
            type="button"
            onClick={() => handleBuy(pack.price_id)}
            disabled={checkoutLoading === pack.price_id || !paddle}
            className="flex flex-col items-center rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center transition hover:border-zinc-400 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          >
            <Zap className="h-5 w-5 text-amber-500" />
            <span className="mt-2 text-lg font-semibold">{formatCredits(pack.credits)}</span>
            <span className="text-xs text-zinc-500">{pack.label}</span>
            {checkoutLoading === pack.price_id && (
              <Loader2 className="mt-2 h-4 w-4 animate-spin text-zinc-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
