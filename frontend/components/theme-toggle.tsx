"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="size-4" />;
  }

  return (
    <div 
      className="flex items-center gap-3 w-full" 
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      role="button"
      aria-label="Toggle theme"
    >
      <Sun className="size-4 shrink-0 dark:hidden" />
      <Moon className="size-4 shrink-0 hidden dark:block" />
      <span className="truncate group-data-[collapsible=icon]:hidden font-medium">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </div>
  );
}
