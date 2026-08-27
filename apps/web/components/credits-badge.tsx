"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Coins } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/api";

export function CreditsBadge() {
  const { getToken } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const user = await getCurrentUser(token);
        if (!cancelled) setBalance(user.credits_balance);
      } catch (err) {
        console.error(err);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <Link
      href="/pricing"
      className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1.5 text-sm font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 sm:gap-1.5 sm:px-3"
      title={balance === null ? undefined : `${balance} credits`}
    >
      <Coins className="h-4 w-4 text-zinc-500" />
      {balance === null ? "—" : <><span>{balance}</span><span className="hidden sm:inline"> credits</span></>}
    </Link>
  );
}
