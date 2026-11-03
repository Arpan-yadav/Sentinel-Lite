"use client";

import { useAuth } from "@/hooks/useAuth";
import { LogOut, User as UserIcon } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/70 backdrop-blur px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-400 font-mono">
          TENANT: <span className="text-slate-200 font-semibold">SECURITY-OPS-DEFAULT</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
          <UserIcon className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-200">{user?.full_name || "Analyst"}</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
            {user?.role || "ANALYST"}
          </span>
        </div>

        <button
          onClick={logout}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

