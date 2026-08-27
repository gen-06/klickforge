"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, CreditCard, Loader2, User } from "lucide-react";
import { getCurrentUser, getSubscription, openCustomerPortal, type Subscription } from "@/lib/api";

export default function AccountPage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [creditsUsed, setCreditsUsed] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionError, setSubscriptionError] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
        const user = await getCurrentUser(token);
        if (cancelled) return;
        setCreditsBalance(user.credits_balance);
        setCreditsUsed(user.credits_used);

        try {
          const sub = await getSubscription(token);
          if (!cancelled) setSubscription(sub);
        } catch {
          if (!cancelled) setSubscriptionError(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const token = await getToken();
      const { url } = await openCustomerPortal(token);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Failed to open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Account</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Manage your credits, subscription, and billing.
        </p>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading account...
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <User className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <h2 className="font-semibold">Credits</h2>
                  <p className="text-sm text-zinc-500">Your current processing balance</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                  <p className="text-sm text-zinc-500">Available credits</p>
                  <p className="mt-1 text-2xl font-semibold">{creditsBalance ?? 0}</p>
                </div>
                <div className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                  <p className="text-sm text-zinc-500">Credits used</p>
                  <p className="mt-1 text-2xl font-semibold">{creditsUsed ?? 0}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  <CreditCard className="h-4 w-4" />
                  Upgrade plan
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <CreditCard className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div>
                  <h2 className="font-semibold">Subscription</h2>
                  <p className="text-sm text-zinc-500">Your current plan and billing details</p>
                </div>
              </div>

              {subscription ? (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                    <span className="text-sm text-zinc-500">Plan</span>
                    <span className="font-medium">{subscription.plan_name ?? subscription.tier ?? "Free"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                    <span className="text-sm text-zinc-500">Status</span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize dark:bg-zinc-800">
                      {subscription.status}
                    </span>
                  </div>
                  {subscription.next_billed_at && (
                    <div className="flex items-center justify-between rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                      <span className="text-sm text-zinc-500">Next billing date</span>
                      <span className="text-sm">{new Date(subscription.next_billed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  {subscription.scheduled_change_action && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Scheduled {subscription.scheduled_change_action} on{" "}
                        {subscription.scheduled_change_at
                          ? new Date(subscription.scheduled_change_at).toLocaleDateString()
                          : "next billing period"}
                        .
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-black dark:text-white dark:hover:bg-zinc-900"
                  >
                    {portalLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Manage billing
                  </button>
                </div>
              ) : subscriptionError ? (
                <div className="mt-6 rounded-xl border border-zinc-100 p-4 dark:border-zinc-800">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No active subscription found. You are on the free plan.
                  </p>
                  <Link
                    href="/pricing"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    View plans
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
