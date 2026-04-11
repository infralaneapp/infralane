"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" disabled><Monitor className="size-3.5" /></Button>;
  }

  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={cycle} type="button" title={`Theme: ${theme}`}>
      {theme === "dark" ? (
        <Moon className="size-3.5" />
      ) : theme === "light" ? (
        <Sun className="size-3.5" />
      ) : (
        <Monitor className="size-3.5" />
      )}
    </Button>
  );
}
