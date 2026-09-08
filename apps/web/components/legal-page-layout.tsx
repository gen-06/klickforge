import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LegalPageLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to ClipForge
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: {lastUpdated}</p>

      <div className="prose-legal mt-10 space-y-6 text-[15px] leading-7 text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </div>
  );
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="!mt-10 text-xl font-semibold text-zinc-900 dark:text-white">
      {children}
    </h2>
  );
}
