"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ApiError, getSubscription, openCustomerPortal, type Subscription } from "@/lib/api";

function formatDate(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function SubscriptionButton() {
  const { getToken } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const sub = await getSubscription(token);
        if (!cancelled) setSubscription(sub);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // 404 means no active subscription.
          if (!cancelled) setSubscription(null);
        } else {
          // Transient failure (network, 5xx, expired token) — don't tell a
          // paying customer they have no subscription. Leave the loading
          // state and let the next render/mount retry.
          console.error("Failed to load subscription", err);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function handleManage() {
    try {
      const token = await getToken();
      const { url } = await openCustomerPortal(token);
      window.location.href = url;
    } catch (err) {
      console.error("Failed to open customer portal", err);
      alert("Could not open billing portal. Please try again.");
    }
  }

  if (subscription === undefined) {
    return (
      <span className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-400 dark:border-zinc-700 dark:bg-black sm:px-4">
        <span className="hidden sm:inline">Loading…</span>
        <span className="sm:hidden">…</span>
      </span>
    );
  }

  if (subscription === null) {
    return (
      <Link
        href="/pricing"
        className="rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 sm:px-4"
      >
        Upgrade
      </Link>
    );
  }

  const scheduledDate = formatDate(subscription.scheduled_change_at);
  const nextBillDate = formatDate(subscription.next_billed_at);

  return (
    <button
      onClick={handleManage}
      className="flex flex-col items-start rounded-full bg-zinc-900 px-3 py-1.5 text-left hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 sm:px-4"
    >
      <span className="text-sm font-medium text-white dark:text-black">
        <span className="hidden sm:inline">Manage subscription</span>
        <span className="sm:hidden">Manage</span>
      </span>
      <span className="hidden text-[10px] leading-tight text-zinc-300 dark:text-zinc-600 sm:block">
        {subscription.plan_name || subscription.tier || "Paid"}
        {subscription.scheduled_change_action === "cancel" && scheduledDate
          ? ` • cancels ${scheduledDate}`
          : nextBillDate
            ? ` • renews ${nextBillDate}`
            : null}
      </span>
    </button>
  );
}
