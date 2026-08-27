import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <Film className="mx-auto h-12 w-12 text-zinc-400" />
      <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">404</h1>
      <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
        We couldn&apos;t find that page. It may have moved or never existed.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-black dark:text-white dark:hover:bg-zinc-900"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
