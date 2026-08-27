"use client";

import { useEffect } from "react";

function isTypingTarget(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export interface Shortcut {
  key: string;
  modifier?: "ctrl" | "meta" | "shift" | "alt";
  description: string;
  action: (event: KeyboardEvent) => void;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event)) return;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const modifierMatches = shortcut.modifier
          ? event[`${shortcut.modifier}Key`]
          : !event.ctrlKey && !event.metaKey && !event.altKey;

        if (keyMatches && modifierMatches) {
          event.preventDefault();
          shortcut.action(event);
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
