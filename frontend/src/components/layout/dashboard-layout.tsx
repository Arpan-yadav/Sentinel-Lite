"use client";

import { ReactNode, Suspense, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { api } from "@/lib/api";

export function DashboardLayout({ children }: { children: ReactNode }) {
  // Background heartbeat to keep Render backend warm while analyst is active
  useEffect(() => {
    const keepAlivePing = async () => {
      try {
        await api.get("/health");
      } catch {
        // Silent catch for background heartbeat
      }
    };

    // Ping once on mount and then every 5 minutes
    keepAlivePing();
    const interval = setInterval(keepAlivePing, 300_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-(--background) text-(--foreground) overflow-hidden font-sans">
      <Suspense fallback={<div className="w-64 bg-(--sidebar-bg) h-screen" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
