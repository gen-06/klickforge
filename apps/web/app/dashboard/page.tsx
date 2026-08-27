"use client";

import { useState } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Settings } from "lucide-react";
import { ActivityFeed } from "@/components/activity-feed";
import { CreditsBadge } from "@/components/credits-badge";
import { OnboardingModal } from "@/components/onboarding-modal";
import { SubscriptionButton } from "@/components/subscription-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardFooter } from "@/components/dashboard-footer";
import { BuyCredits } from "@/components/buy-credits";
import { UploadForm } from "@/components/upload-form";
import { VideoList } from "@/components/video-list";

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col flex-1">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-black sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="text-base font-semibold sm:text-lg">
            ClipForge
          </Link>
          <span className="hidden rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800 sm:inline">
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <CreditsBadge />
          <SubscriptionButton />
          <ThemeToggle />
          <Link
            href="/account"
            className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Account settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 sm:space-y-8 sm:p-6">
        <OnboardingModal />
        <UploadForm onUploaded={() => setRefreshKey((k) => k + 1)} />
        <BuyCredits />
        <VideoList refreshKey={refreshKey} />
        <ActivityFeed />
      </main>
      <DashboardFooter />
    </div>
  );
}
