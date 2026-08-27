"use client";

import type { Shortcut } from "@/hooks/use-keyboard-shortcuts";

interface ShortcutsHelpProps {
  shortcuts: Shortcut[];
  onClose: () => void;
}

export function ShortcutsHelp({ shortcuts, onClose }: ShortcutsHelpProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close shortcuts"
          >
            <kbd className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs dark:border-zinc-700">Esc</kbd>
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {shortcuts.map((shortcut, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{shortcut.description}</span>
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {shortcut.modifier ? `${shortcut.modifier} + ` : ""}
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          Shortcuts are disabled while typing in inputs, textareas, or selects.
        </p>
      </div>
    </div>
  );
}
