"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="size-4" />;
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div 
      className="flex items-center gap-2 cursor-pointer w-full" 
      onClick={toggleTheme}
      role="button"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 transition-all dark:hidden text-foreground" />
      <Moon className="h-4 w-4 transition-all hidden dark:block text-foreground" />
      <span className="truncate group-data-[collapsible=icon]:hidden">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </div>
  );
}
