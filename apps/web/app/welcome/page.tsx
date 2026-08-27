import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";

export default async function WelcomePage() {
  const user = await currentUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <span className="text-lg font-semibold">ClipForge</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
          Welcome to ClipForge{user?.firstName ? `, ${user.firstName}` : ""}!
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Your subscription is being set up. You can start creating clips from
          your dashboard right away.
        </p>
        <div className="mt-10">
          <Link
            href="/dashboard"
            className="rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
