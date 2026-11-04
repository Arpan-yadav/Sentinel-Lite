"use client";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  const isDark = (resolvedTheme || theme) === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--background-card)]/80 backdrop-blur px-8 flex items-center justify-between transition-colors duration-200 shrink-0">
      <div className="flex items-center gap-3">
        <div className="text-xs text-[var(--foreground-muted)] font-mono">
          TENANT:{" "}
          <span className="text-[var(--foreground)] font-semibold">
            SECURITY-OPS-DEFAULT
          </span>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">LIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* User badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--background-muted)] border border-[var(--border)] text-xs">
          <UserIcon className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
          <span className="text-[var(--foreground)] font-medium">
            {user?.full_name || "Analyst"}
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--background)] text-emerald-600 dark:text-emerald-400 font-semibold border border-[var(--border)]">
            {user?.role || "ANALYST"}
          </span>
        </div>

        {/* Dark/Light toggle */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] border border-[var(--border)] transition-colors cursor-pointer"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="p-2 rounded-lg text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-500/10 border border-[var(--border)] transition-colors cursor-pointer"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
