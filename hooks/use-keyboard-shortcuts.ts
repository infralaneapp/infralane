"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case "n":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            router.push("/tickets/new");
          }
          break;
        case "g":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            router.push("/tickets");
          }
          break;
        case "d":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            router.push("/dashboard");
          }
          break;
        case "b":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            router.push("/tickets/board");
          }
          break;
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);
}
