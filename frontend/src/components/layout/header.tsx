"use client";

import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun, User as UserIcon, Sparkles, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { AISettingsModal, AIProvider } from "@/components/ai/ai-settings-modal";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<AIProvider>("gemini");
  const [hasCustomKey, setHasCustomKey] = useState(false);

  // Sync AI settings from localStorage
  const updateAiState = () => {
    if (typeof window !== "undefined") {
      const p = (localStorage.getItem("sentinellite_ai_provider") as AIProvider) || "gemini";
      const k = localStorage.getItem("sentinellite_ai_key");
      setActiveProvider(p);
      setHasCustomKey(Boolean(k && k.trim()));
    }
  };

  useEffect(() => {
    setMounted(true);
    updateAiState();

    const handleAiUpdate = () => updateAiState();
    window.addEventListener("sentinellite:ai-updated", handleAiUpdate);
    return () => window.removeEventListener("sentinellite:ai-updated", handleAiUpdate);
  }, []);

  const isDark = (resolvedTheme || theme) === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const providerNames: Record<AIProvider, string> = {
    gemini: "Gemini",
    openai: "GPT-4o",
    claude: "Claude",
  };

  return (
    <>
      <header className="h-16 border-b border-(--border) bg-(--background-card)/80 backdrop-blur px-8 flex items-center justify-between transition-colors duration-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-xs text-(--foreground-muted) font-mono">
            TENANT:{" "}
            <span className="text-(--foreground) font-semibold">
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
          {/* AI Provider Config Pill */}
          {mounted && (
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--background-muted) border border-(--border) hover:border-emerald-500/50 text-xs transition-all cursor-pointer shadow-xs group"
              title="Click to change AI reasoning engine (Gemini, Claude, GPT) or configure custom API key"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-500 group-hover:rotate-12 transition-transform" />
              <span className="font-mono text-[11px] font-semibold text-(--foreground)">
                AI: {providerNames[activeProvider]}
              </span>
              <span
                className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                  hasCustomKey
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 font-bold"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium"
                }`}
              >
                {hasCustomKey ? "USER KEY" : "SERVER"}
              </span>
              <SlidersHorizontal className="h-3 w-3 text-(--foreground-muted)" />
            </button>
          )}

          {/* User badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--background-muted) border border-(--border) text-xs">
            <UserIcon className="h-3.5 w-3.5 text-(--foreground-muted)" />
            <span className="text-(--foreground) font-medium">
              {user?.full_name || "Analyst"}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-(--background) text-emerald-600 dark:text-emerald-400 font-semibold border border-(--border)">
              {user?.role || "ANALYST"}
            </span>
          </div>

          {/* Dark/Light toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-(--foreground-muted) hover:text-(--foreground) hover:bg-(--background-muted) border border-(--border) transition-colors cursor-pointer"
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
            className="p-2 rounded-lg text-(--foreground-muted) hover:text-red-500 hover:bg-red-500/10 border border-(--border) transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* AI Reasoning Settings Modal */}
      <AISettingsModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </>
  );
}
