"use client";

import { useState } from "react";
import { X, Upload, Sparkles, Scissors, Download } from "lucide-react";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to ClipForge",
    description:
      "Turn your long-form videos into vertical clips for TikTok, Reels, and Shorts — automatically.",
  },
  {
    icon: Upload,
    title: "Upload your video",
    description:
      "Pick a video, choose the source and target languages, caption style, and voiceover option.",
  },
  {
    icon: Scissors,
    title: "We create your clips",
    description:
      "We find the best moments, crop them to 9:16, add captions, and dub if you want.",
  },
  {
    icon: Download,
    title: "Edit and publish",
    description:
      "Preview each clip, tweak the start/end times, edit captions, and download to post everywhere.",
  },
];

const STORAGE_KEY = "clipforge-onboarding-dismissed";

function _initiallyOpen() {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(STORAGE_KEY);
}

export function OnboardingModal() {
  const [open, setOpen] = useState(_initiallyOpen);
  const [step, setStep] = useState(0);

  function dismiss() {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function previous() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-950">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
          <Icon className="h-7 w-7 text-zinc-900 dark:text-white" />
        </div>

        <h2 className="text-xl font-semibold">{current.title}</h2>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{current.description}</p>

        <div className="mt-6 flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-zinc-900 dark:bg-white" : "w-2 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={previous}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-0 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Back
          </button>
          <button
            onClick={next}
            className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {step === STEPS.length - 1 ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
