"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Key,
  Check,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  RotateCcw,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";

export type AIProvider = "gemini" | "openai" | "claude";

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestResult {
  status: "connected" | "error" | "unconfigured" | "fallback";
  message?: string;
  latency_ms?: number;
  model?: string;
}

const PROVIDERS: {
  id: AIProvider;
  name: string;
  tagline: string;
  defaultModel: string;
  models: string[];
  keyPlaceholder: string;
  docsUrl: string;
}[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Ultra-fast SOC synthesis & multimodal reasoning",
    defaultModel: "gemini-3.5-flash-lite",
    models: ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"],
    keyPlaceholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "openai",
    name: "OpenAI GPT",
    tagline: "Industry-standard structured JSON reasoning",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
    keyPlaceholder: "sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    tagline: "Superior nuanced threat analysis & MITRE mapping",
    defaultModel: "claude-3-5-haiku-20241022",
    models: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"],
    keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
];

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load existing settings on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedProvider = (localStorage.getItem("sentinellite_ai_provider") as AIProvider) || "gemini";
      const storedKey = localStorage.getItem("sentinellite_ai_key") || "";
      const storedModel = localStorage.getItem("sentinellite_ai_model") || "";

      setProvider(storedProvider);
      setApiKey(storedKey);
      setModel(storedModel || PROVIDERS.find((p) => p.id === storedProvider)?.defaultModel || "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProviderConfig = PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    const targetConfig = PROVIDERS.find((p) => p.id === newProvider);
    setModel(targetConfig?.defaultModel || "");
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post<TestResult>("/investigation/test-ai", {
        provider,
        api_key: apiKey.trim() || null,
        model: model.trim() || null,
      });
      setTestResult(res.data);
    } catch (err: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr = err as any;
      const detail = anyErr?.response?.data?.detail || anyErr?.message || "Connection failed";
      setTestResult({
        status: "error",
        message: `Endpoint probe failed: ${detail}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sentinellite_ai_provider", provider);
      if (apiKey.trim()) {
        localStorage.setItem("sentinellite_ai_key", apiKey.trim());
      } else {
        localStorage.removeItem("sentinellite_ai_key");
      }
      if (model.trim()) {
        localStorage.setItem("sentinellite_ai_model", model.trim());
      } else {
        localStorage.removeItem("sentinellite_ai_model");
      }

      window.dispatchEvent(new Event("sentinellite:ai-updated"));
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    }
  };

  const handleResetToDefault = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sentinellite_ai_provider");
      localStorage.removeItem("sentinellite_ai_key");
      localStorage.removeItem("sentinellite_ai_model");

      setProvider("gemini");
      setApiKey("");
      setModel(PROVIDERS[0].defaultModel);
      setTestResult(null);
      window.dispatchEvent(new Event("sentinellite:ai-updated"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl bg-(--background-card) border border-(--border) shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--border) pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-(--foreground) tracking-tight">
                AI Reasoning Engine Settings
              </h2>
              <p className="text-xs text-(--foreground-muted)">
                Choose your AI provider or plug in your personal API key (Gemini, Claude, GPT).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-(--foreground-muted) hover:text-(--foreground) hover:bg-(--background-muted) transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Provider Cards */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-semibold text-(--foreground-muted) uppercase tracking-wider">
            1. Select AI Reasoning Provider
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {PROVIDERS.map((p) => {
              const isSelected = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/20"
                      : "bg-(--background-muted)/40 border-(--border) hover:border-(--border-hover) hover:bg-(--background-muted)"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-(--foreground)">{p.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                  <span className="text-[10px] text-(--foreground-muted) mt-1.5 line-clamp-2">
                    {p.tagline}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-(--foreground-muted) uppercase tracking-wider">
              2. Target Model
            </label>
            <span className="text-[10px] text-(--foreground-muted) font-mono">
              Default: {currentProviderConfig.defaultModel}
            </span>
          </div>
          <div className="flex gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 bg-(--background-muted) border border-(--border) rounded-lg px-3 py-2 text-xs font-mono text-(--foreground) focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            >
              {currentProviderConfig.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-(--foreground-muted) uppercase tracking-wider flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-emerald-500" />
              3. Personal API Key (Optional)
            </label>
            <a
              href={currentProviderConfig.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-emerald-500 hover:underline flex items-center gap-1 font-mono"
            >
              Get {currentProviderConfig.name} Key &rarr;
            </a>
          </div>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Leave empty to use server default, or paste ${currentProviderConfig.keyPlaceholder}`}
              className="w-full bg-(--background-muted) border border-(--border) rounded-lg pl-3 pr-10 py-2 text-xs font-mono text-(--foreground) placeholder:text-(--foreground-muted)/50 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-(--foreground-muted) hover:text-(--foreground)"
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-(--foreground-muted)">
            Your key is kept safe in your browser&apos;s local storage and sent encrypted via HTTPS. It is never logged or shared.
          </p>
        </div>

        {/* Test Result Display */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.status === "connected"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : testResult.status === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            {testResult.status === "connected" ? (
              <Check className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-semibold flex items-center gap-2">
                <span>
                  {testResult.status === "connected"
                    ? "Connection Successful"
                    : testResult.status === "error"
                    ? "Authentication Error"
                    : "Deterministic Heuristic Fallback"}
                </span>
                {testResult.latency_ms !== undefined && (
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/30 border border-white/10">
                    {testResult.latency_ms}ms
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-(--border)">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 text-xs text-(--foreground-muted) hover:text-(--foreground) font-mono transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to Server Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border) hover:bg-(--background-muted) text-xs font-mono text-(--foreground) transition-colors cursor-pointer disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-amber-400" />}
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Saved!
                </>
              ) : (
                "Save Preferences"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

