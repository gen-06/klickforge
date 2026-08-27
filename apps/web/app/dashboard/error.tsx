"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Dashboard error</h1>
      <p className="mt-4 max-w-md text-zinc-600 dark:text-zinc-400">
        We couldn&apos;t load the dashboard. Try refreshing, or come back in a moment.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-zinc-400">Error ID: {error.digest}</p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-black dark:text-white dark:hover:bg-zinc-900"
        >
          <LayoutDashboard className="h-4 w-4" />
          Reload dashboard
        </Link>
      </div>
    </div>
  );
}
