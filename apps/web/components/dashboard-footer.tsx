import Link from "next/link";

export function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-zinc-500">© {currentYear} ClipForge</p>
        <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-zinc-200">
            Pricing
          </Link>
          <Link href="/account" className="hover:text-zinc-900 dark:hover:text-zinc-200">
            Account
          </Link>
          <Link href="/docs/api" className="hover:text-zinc-900 dark:hover:text-zinc-200">
            API docs
          </Link>
          <a
            href="mailto:support@clipforge.app"
            className="hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}
