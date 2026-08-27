import { headers } from "next/headers";
import { currentUser } from "@clerk/nextjs/server";
import { getRequiredEnv } from "@/lib/env";
import { PricingCards } from "@/components/pricing-cards";

async function getCountryCode(): Promise<string | null> {
  const h = await headers();
  const country =
    h.get("x-vercel-ip-country") ??
    h.get("cloudfront-viewer-country") ??
    h.get("cf-ipcountry");
  return country ?? null;
}

export default async function PricingPage() {
  const country = await getCountryCode();
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;

  const clientToken = getRequiredEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN");
  const environment = getRequiredEnv("NEXT_PUBLIC_PADDLE_ENV") as
    | "sandbox"
    | "live";
  const priceIds = {
    starter: {
      month: getRequiredEnv("NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTH"),
      year: getRequiredEnv("NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEAR"),
    },
    pro: {
      month: getRequiredEnv("NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTH"),
      year: getRequiredEnv("NEXT_PUBLIC_PADDLE_PRICE_PRO_YEAR"),
    },
    advanced: {
      month: getRequiredEnv("NEXT_PUBLIC_PADDLE_PRICE_ADVANCED_MONTH"),
      year: getRequiredEnv("NEXT_PUBLIC_PADDLE_PRICE_ADVANCED_YEAR"),
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-black">
        <span className="text-lg font-semibold">ClipForge</span>
      </header>
      <main className="flex-1">
        <PricingCards
          priceIds={priceIds}
          environment={environment}
          clientToken={clientToken}
          country={country}
          email={email}
        />
      </main>
    </div>
  );
}
