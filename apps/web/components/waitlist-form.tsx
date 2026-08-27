"use client";

import { useState } from "react";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { joinWaitlist } from "@/lib/api";

interface WaitlistFormProps {
  source?: string;
}

export function WaitlistForm({ source = "landing" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const result = await joinWaitlist(email, source);
      if (result.status === "already_registered") {
        setStatus("success");
        setMessage("You're already on the list — we'll be in touch!");
      } else {
        setStatus("success");
        setMessage("You're on the waitlist. We'll email you when we launch!");
      }
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-green-800 dark:bg-green-950 dark:text-green-200">
        <CheckCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-base focus:border-zinc-900 focus:outline-none disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
        Join waitlist
      </button>
      {status === "error" && <p className="text-sm text-red-600 sm:w-full">{message}</p>}
    </form>
  );
}
