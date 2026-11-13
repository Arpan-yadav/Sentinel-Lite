"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Client, AnalystUser, AiStatus } from "@/types";
import {
  Building2,
  Users,
  Cpu,
  ShieldCheck,
  Plus,
  RefreshCw,
  Zap,
  Globe,
  Lock,
} from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"clients" | "analysts" | "ai">("clients");

  // Clients state
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    industry: "Financial Services",
    tier: "Enterprise",
    network_cidr: "10.0.0.0/16",
    contact_email: "",
    health_score: 95,
  });

  // Analysts state
  const [analysts, setAnalysts] = useState<AnalystUser[]>([]);
  const [showAddAnalyst, setShowAddAnalyst] = useState(false);
  const [newAnalyst, setNewAnalyst] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "analyst",
  });

  // AI & Infrastructure state
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [testingAi, setTestingAi] = useState(false);

  // Load clients
  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get<Client[]>("/clients");
      setClients(res.data);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  }, []);

  // Load analysts
  const fetchAnalysts = useCallback(async () => {
    try {
      const res = await api.get<AnalystUser[]>("/admin/analysts");
      setAnalysts(res.data);
    } catch (err) {
      console.error("Error fetching analysts:", err);
    }
  }, []);

  // Check AI Status
  const checkAiStatus = useCallback(async () => {
    try {
      setTestingAi(true);
      const res = await api.get<AiStatus>("/admin/ai-status");
      setAiStatus(res.data);
    } catch (err) {
      console.error("Error testing AI:", err);
    } finally {
      setTestingAi(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchAnalysts();
    checkAiStatus();
  }, [fetchClients, fetchAnalysts, checkAiStatus]);

  // Handle Add Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/clients", {
        ...newClient,
        status: "active",
        active_incidents: 0,
        is_active: true,
      });
      setShowAddClient(false);
      setNewClient({
        name: "",
        industry: "Financial Services",
        tier: "Enterprise",
        network_cidr: "10.0.0.0/16",
        contact_email: "",
        health_score: 95,
      });
      fetchClients();
    } catch (err) {
      alert("Failed to create client: " + err);
    }
  };

  // Handle Add Analyst
  const handleCreateAnalyst = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/analysts", newAnalyst);
      setShowAddAnalyst(false);
      setNewAnalyst({ email: "", password: "", full_name: "", role: "analyst" });
      fetchAnalysts();
    } catch (err) {
      alert("Failed to create analyst: " + err);
    }
  };

  // Handle Toggle Analyst
  const handleToggleAnalyst = async (id: string, currentActive: boolean) => {
    try {
      await api.patch(`/admin/analysts/${id}/status?active=${!currentActive}`);
      fetchAnalysts();
    } catch (err) {
      alert("Error updating status: " + err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-(--border)">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-(--foreground)">
              Admin Governance & Client Operations
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold">
              Admin Restricted
            </span>
          </div>
          <p className="text-sm text-(--foreground-muted) font-mono mt-1">
            Enterprise client tenants, SOC analyst workforce management, and Google Gemini AI orchestration
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-(--background-card) border border-(--border) text-(--foreground-muted)">
            Active Role: <span className="text-emerald-500 font-bold uppercase">{user?.role || "ADMIN"}</span>
          </div>
        </div>
      </div>

      {/* Role Difference Explainer Banner */}
      <div className="p-4 rounded-xl bg-(--background-card) border border-(--border) grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1.5 border-r border-(--border) pr-4">
          <div className="flex items-center gap-2 text-purple-500 font-bold uppercase font-mono">
            <Lock className="h-4 w-4" /> Admin Capabilities
          </div>
          <p className="text-(--foreground-muted)">
            Manages enterprise clients & tenant CIDRs, provisions analyst accounts, audits triage logs, overrides blocklists, and monitors Gemini AI engine health & API tokens.
          </p>
        </div>
        <div className="space-y-1.5 pl-2">
          <div className="flex items-center gap-2 text-emerald-500 font-bold uppercase font-mono">
            <ShieldCheck className="h-4 w-4" /> Analyst Capabilities
          </div>
          <p className="text-(--foreground-muted)">
            Performs operational incident triage, reviews ML classification flags, traverses Temporal Knowledge Graphs (TKG), approves/rejects AI remediation, and runs custom analytics.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-(--border) pb-1">
        <button
          onClick={() => setActiveTab("clients")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-xs font-bold transition-all cursor-pointer ${
            activeTab === "clients"
              ? "bg-(--background-card) border-t border-x border-(--border) text-purple-500 dark:text-purple-400"
              : "text-(--foreground-muted) hover:text-(--foreground)"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Enterprise Clients ({clients.length})
        </button>

        <button
          onClick={() => setActiveTab("analysts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-xs font-bold transition-all cursor-pointer ${
            activeTab === "analysts"
              ? "bg-(--background-card) border-t border-x border-(--border) text-purple-500 dark:text-purple-400"
              : "text-(--foreground-muted) hover:text-(--foreground)"
          }`}
        >
          <Users className="h-4 w-4" />
          SOC Analysts & Team ({analysts.length})
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-xs font-bold transition-all cursor-pointer ${
            activeTab === "ai"
              ? "bg-(--background-card) border-t border-x border-(--border) text-purple-500 dark:text-purple-400"
              : "text-(--foreground-muted) hover:text-(--foreground)"
          }`}
        >
          <Cpu className="h-4 w-4" />
          AI & ML System Health
        </button>
      </div>

      {/* TAB 1: CLIENTS */}
      {activeTab === "clients" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-(--foreground)">Monitored Enterprise Client Tenants</h2>
              <p className="text-xs text-(--foreground-muted) font-mono">
                Organizations protected by SentinelLite sensors and automated defense
              </p>
            </div>
            <button
              onClick={() => setShowAddClient(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Client Organization
            </button>
          </div>

          {/* Add Client Form Modal */}
          {showAddClient && (
            <form onSubmit={handleCreateClient} className="p-5 rounded-2xl bg-(--background-card) border border-(--border) space-y-4">
              <h3 className="text-sm font-bold text-(--foreground) font-mono">Register New Client Tenant</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Company / Organization Name</label>
                  <input
                    required
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="e.g. Apex Biotech Corp"
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  />
                </div>
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Industry Vertical</label>
                  <select
                    value={newClient.industry}
                    onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  >
                    <option>Financial Services</option>
                    <option>Healthcare & Biotech</option>
                    <option>Defense & Logistics</option>
                    <option>Retail & eCommerce</option>
                    <option>SaaS & Cloud Native</option>
                  </select>
                </div>
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Monitored Network CIDR</label>
                  <input
                    required
                    value={newClient.network_cidr}
                    onChange={(e) => setNewClient({ ...newClient, network_cidr: e.target.value })}
                    placeholder="10.150.0.0/16"
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  />
                </div>
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Contact Email</label>
                  <input
                    required
                    type="email"
                    value={newClient.contact_email}
                    onChange={(e) => setNewClient({ ...newClient, contact_email: e.target.value })}
                    placeholder="security@apexbiotech.com"
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  />
                </div>
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Service Tier</label>
                  <select
                    value={newClient.tier}
                    onChange={(e) => setNewClient({ ...newClient, tier: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  >
                    <option>Enterprise</option>
                    <option>Standard</option>
                    <option>Starter</option>
                  </select>
                </div>
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Baseline Health Score (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newClient.health_score}
                    onChange={(e) => setNewClient({ ...newClient, health_score: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClient(false)}
                  className="px-3 py-1.5 rounded-lg bg-(--background-muted) border border-(--border) text-xs font-mono text-(--foreground-muted)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold"
                >
                  Save Organization
                </button>
              </div>
            </form>
          )}

          {/* Client Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clients.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-(--background-card) border border-(--border) space-y-4 shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-(--foreground) text-sm">{c.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        {c.tier}
                      </span>
                    </div>
                    <div className="text-xs text-(--foreground-muted) flex items-center gap-2">
                      <Globe className="h-3 w-3" /> {c.industry}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      c.status === "active"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-(--background-muted) text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-(--foreground-muted) uppercase">Sensor Subnet</div>
                    <div className="font-bold text-(--foreground) mt-0.5">{c.network_cidr}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-(--foreground-muted) uppercase">Active Incidents</div>
                    <div className={`font-bold mt-0.5 ${c.active_incidents > 0 ? "text-red-500" : "text-emerald-500"}`}>
                      {c.active_incidents} Detected
                    </div>
                  </div>
                </div>

                {/* Health Score Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-(--foreground-muted)">Perimeter Health Score</span>
                    <span className="font-bold text-emerald-500">{c.health_score}%</span>
                  </div>
                  <div className="w-full bg-(--background-muted) h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        c.health_score > 90 ? "bg-emerald-500" : c.health_score > 75 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${c.health_score}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-(--foreground-muted) font-mono pt-1 border-t border-(--border) flex justify-between items-center">
                  <span>Contact: {c.contact_email}</span>
                  <span className="text-emerald-500 font-mono">Sensor Live â€¢ Real-Time Telemetry</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ANALYSTS */}
      {activeTab === "analysts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-(--foreground)">SOC Team Workforce</h2>
              <p className="text-xs text-(--foreground-muted) font-mono">
                Manage analysts, permission roles, and active triage authorizations
              </p>
            </div>
            <button
              onClick={() => setShowAddAnalyst(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Invite SOC Analyst
            </button>
          </div>

          {/* Add Analyst Form Modal */}
          {showAddAnalyst && (
            <form onSubmit={handleCreateAnalyst} className="p-5 rounded-2xl bg-(--background-card) border border-(--border) space-y-4">
              <h3 className="text-sm font-bold text-(--foreground) font-mono">Invite New Security Analyst</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Full Name</label>
                  <input
                    required
                    value={newAnalyst.full_name}
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, full_name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  />
                </div>
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Email Address</label>
                  <input
                    required
                    type="email"
                    value={newAnalyst.email}
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, email: e.target.value })}
                    placeholder="analyst2@sentinellite.io"
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  />
                </div>
                <div>
                  <label className="text-(--foreground-muted) block mb-1">Temporary Password</label>
                  <input
                    required
                    type="password"
                    value={newAnalyst.password}
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, password: e.target.value })}
                    placeholder="StrongPassword123!"
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  />
                </div>
                <div>
                  <label className="text-(--foreground-muted) block mb-1">SOC Role</label>
                  <select
                    value={newAnalyst.role}
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-(--background) border border-(--border) text-(--foreground)"
                  >
                    <option value="analyst">Analyst (Triage & TKG)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAnalyst(false)}
                  className="px-3 py-1.5 rounded-lg bg-(--background-muted) border border-(--border) text-xs font-mono text-(--foreground-muted)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* Analysts Table */}
          <div className="rounded-2xl bg-(--background-card) border border-(--border) overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-(--background-muted) border-b border-(--border) text-(--foreground-muted) uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3">Analyst / Name</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {analysts.map((a) => (
                  <tr key={a.id} className="hover:bg-(--background-muted)/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-(--foreground)">{a.full_name}</td>
                    <td className="px-5 py-3.5 text-(--foreground-muted)">{a.email}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          a.role === "admin"
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {a.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          a.is_active
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}
                      >
                        {a.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleAnalyst(a.id, a.is_active)}
                        className="px-2.5 py-1 rounded bg-(--background-muted) hover:bg-(--background) border border-(--border) text-[11px] font-mono text-(--foreground-muted) hover:text-(--foreground)"
                      >
                        {a.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AI & SYSTEM HEALTH */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-(--background-card) border border-(--border) space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-(--foreground)">Google Gemini AI Investigation Engine</h2>
                  <p className="text-xs text-(--foreground-muted) font-mono">
                    LLM-powered autonomous forensic investigation, MITRE reasoning, and remediation drafting
                  </p>
                </div>
              </div>

              <button
                onClick={checkAiStatus}
                disabled={testingAi}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-(--background-muted) hover:bg-(--background) border border-(--border) text-xs font-mono font-bold text-(--foreground) transition-all cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testingAi ? "animate-spin" : ""}`} />
                Test API Key Connection
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-(--background-muted) border border-(--border) space-y-1">
                <div className="text-[10px] font-mono text-(--foreground-muted) uppercase">Engine Status</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-sm font-bold text-emerald-500 font-mono">
                    {aiStatus?.status === "connected" ? "CONNECTED & VERIFIED" : aiStatus?.status ? aiStatus.status.toUpperCase() : "TESTING..."}
                  </span>
                </div>
                <div className="text-[11px] text-(--foreground-muted) font-mono pt-1">
                  {aiStatus?.message || "Checking Gemini API key..."}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-(--background-muted) border border-(--border) space-y-1">
                <div className="text-[10px] font-mono text-(--foreground-muted) uppercase">Active Model & SDK</div>
                <div className="text-sm font-bold text-(--foreground) font-mono mt-1">
                  {aiStatus?.model || "gemini-3.5-flash"}
                </div>
                <div className="text-[11px] text-purple-400 font-mono pt-1">
                  SDK: {aiStatus?.sdk || "google.genai (Interactions v1)"}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-(--background-muted) border border-(--border) space-y-1">
                <div className="text-[10px] font-mono text-(--foreground-muted) uppercase">Measured Round-Trip Latency</div>
                <div className="text-sm font-bold text-(--foreground) font-mono mt-1">
                  {aiStatus?.latency_ms ? `${aiStatus.latency_ms} ms` : "Calculating..."}
                </div>
                <div className="text-[11px] text-emerald-500 font-mono pt-1">
                  High-speed real-time response
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-(--background) border border-(--border) text-xs font-mono text-(--foreground-muted) space-y-2">
              <div className="font-bold text-(--foreground)">Gemini Configuration Details:</div>
              <div>â€¢ API Key: <code className="text-purple-400">{aiStatus?.key_prefix || "Configured in .env"}</code></div>
              <div>â€¢ Temperature: <code>0.20 (deterministic, evidence-grounded responses)</code></div>
              <div>â€¢ Guardrails: <code>Strict JSON schema adherence, anti-hallucination evidence check</code></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
