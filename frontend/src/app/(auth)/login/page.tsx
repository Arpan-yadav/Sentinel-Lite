"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, Lock, Mail, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@sentinellite.io");
  const [password, setPassword] = useState("AdminPass123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const success = await login(email, password);
    if (success) {
      router.push("/dashboard");
    } else {
      setError("Invalid security credentials or tenant configuration.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--background) flex items-center justify-center p-6 text-(--foreground) transition-colors duration-200">
      <div className="w-full max-w-md p-8 rounded-2xl bg-(--background-card) border border-(--border) shadow-2xl backdrop-blur">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 mb-3 animate-glow">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-(--foreground)">
            Sentinel<span className="text-emerald-500 dark:text-emerald-400">Lite</span> SOC Portal
          </h1>
          <p className="text-xs text-(--foreground-muted) font-mono mt-1">Authenticate to access threat telemetry</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs text-center font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-(--foreground-muted) mb-1.5 uppercase font-semibold">
              Analyst Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-(--foreground-muted)" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-(--background-muted) border border-(--border) focus:border-emerald-500 focus:outline-none text-sm text-(--foreground) font-mono transition-colors"
                placeholder="analyst@sentinellite.io"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-(--foreground-muted) mb-1.5 uppercase font-semibold">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-(--foreground-muted)" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-(--background-muted) border border-(--border) focus:border-emerald-500 focus:outline-none text-sm text-(--foreground) font-mono transition-colors"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? "Verifying..." : "Access Console"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-(--border) text-center">
          <span className="text-[11px] text-(--foreground-muted) font-mono">
            Demo Credentials: <span className="text-(--foreground) font-semibold">admin@sentinellite.io</span> / <span className="text-(--foreground) font-semibold">AdminPass123!</span>
          </span>
        </div>
      </div>
    </div>
  );
}
