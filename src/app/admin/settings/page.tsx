'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/useToast';

// ─── Types ──────────────────────────────────────────────────────────────────────

type Provider = 'claude' | 'openai' | 'gemini' | 'ollama';
type SearchMode = 'free' | 'tavily';

type ProviderInfo = {
  configured: boolean;
  models: string[];
};

type StoreInfo = {
  name: string;
  email: string;
  domain: string;
  primaryDomain: string;
  plan: string;
  currency: string;
  apiVersion: string;
};

type ApiKeyStatus = {
  configured: boolean;
  source: 'env' | 'runtime' | null;
  masked: string;
};

type Config = {
  provider: Provider;
  model: string;
  ollama: { baseUrl: string; model: string };
  shopify: {
    domain: string;
    clientId: string;
    hasClientSecret: boolean;
    connected: boolean;
  };
  providers: Record<Provider, ProviderInfo>;
  storeInfo: StoreInfo | null;
  apiKeyStatus?: Record<'claude' | 'openai' | 'gemini', ApiKeyStatus>;
};

// ─── Provider Metadata ─────────────────────────────────────────────────────────

const PROVIDER_META: Record<
  Provider,
  { name: string; icon: string; color: string; envKey: string; description: string }
> = {
  claude: {
    name: 'Claude (Anthropic)',
    icon: 'psychology',
    color: '#d4a843',
    envKey: 'ANTHROPIC_API_KEY',
    description: 'Anthropic Claude — best tool calling, recommended for Shopify admin.',
  },
  openai: {
    name: 'OpenAI (GPT)',
    icon: 'auto_awesome',
    color: '#10b981',
    envKey: 'OPENAI_API_KEY',
    description: 'OpenAI GPT-4o — fast, reliable, great for general tasks.',
  },
  gemini: {
    name: 'Google Gemini',
    icon: 'diamond',
    color: '#6366f1',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    description: 'Google Gemini — multimodal, good for image analysis.',
  },
  ollama: {
    name: 'Ollama (Local)',
    icon: 'computer',
    color: '#f97316',
    envKey: '',
    description: 'Run AI locally — free, private, no API key needed. Requires Ollama running.',
  },
};

// ─── Setup Guide Component ─────────────────────────────────────────────────────

function SetupGuide({
  open,
  onToggle,
  steps,
  pricing,
  pricingNote,
  freeNote,
  links,
}: {
  open: boolean;
  onToggle: () => void;
  steps: string[];
  pricing?: string;
  pricingNote?: string;
  freeNote?: string;
  links?: { text: string; href: string }[];
}) {
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-[10px] text-[#6b7280] hover:text-[#9ca3af] transition-colors"
      >
        <span
          className="material-symbols-outlined text-sm transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
        {open ? 'Hide setup guide' : 'Show setup guide'}
      </button>
      {open && (
        <div className="mt-2 bg-[#0a0f1e]/50 rounded-xl p-4 space-y-3">
          <ol className="space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-[#9ca3af]">
                <span className="font-mono text-xs text-[#374151] shrink-0 w-4">{i + 1}.</span>
                <span dangerouslySetInnerHTML={{ __html: step }} />
              </li>
            ))}
          </ol>
          {pricing && (
            <p className="text-[#374151] text-[10px] border-t border-[#1f2d4e] pt-2">
              💰 {pricing}
            </p>
          )}
          {pricingNote && <p className="text-[#374151] text-[10px]">🎁 {pricingNote}</p>}
          {freeNote && <p className="text-[#10b981] text-[10px]">✅ {freeNote}</p>}
          {links && (
            <div className="flex gap-3 flex-wrap pt-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[#d4a843] hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                  {l.text}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section Header Component ──────────────────────────────────────────────────

function SectionHeader({
  icon,
  iconColor = 'text-[#d4a843]',
  title,
  description,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="px-6 py-4 border-b border-[#1f2d4e]">
      <h2 className="text-white font-semibold flex items-center gap-2">
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
        {title}
      </h2>
      {description && <p className="text-[#6b7280] text-xs mt-1">{description}</p>}
    </div>
  );
}

// ─── Status Dot Component ──────────────────────────────────────────────────────

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1.5 text-xs ${ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}
    >
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
      {label}
    </span>
  );
}

// ─── Info Row Component ────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1f2d4e] last:border-0">
      <span className="text-xs text-[#6b7280]">{label}</span>
      <span className={`text-sm text-[#d1d5db] ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toast } = useToast();

  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  // AI Provider state
  const [selectedProvider, setSelectedProvider] = useState<Provider>('claude');
  const [selectedModel, setSelectedModel] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.1:8b');

  // API Key state (inputs — never pre-filled with real values)
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({
    claude: '',
    openai: '',
    gemini: '',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    claude: false,
    openai: false,
    gemini: false,
  });

  // Connection test results
  const [shopifyTest, setShopifyTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [ollamaTest, setOllamaTest] = useState<{
    ok: boolean;
    msg: string;
    models?: string[];
  } | null>(null);
  const [testing, setTesting] = useState('');

  // Admin config state
  const [clearingCache, setClearingCache] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Market Research state
  const [searchMode, setSearchMode] = useState<SearchMode>('free');
  const [tavilyKey, setTavilyKey] = useState('');
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [tavilyGuideOpen, setTavilyGuideOpen] = useState(false);
  const [tavilyTest, setTavilyTest] = useState<{ ok: boolean; msg: string } | null>(null);

  // Setup guide expand state per provider
  const [guideOpen, setGuideOpen] = useState<Record<string, boolean>>({
    claude: false,
    openai: false,
    gemini: false,
    ollama: false,
  });

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data: Config) => {
        setConfig(data);
        setSelectedProvider(data.provider);
        setSelectedModel(data.model);
        setOllamaUrl(data.ollama.baseUrl);
        setOllamaModel(data.ollama.model);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [toast]);

  // ─── AI Save ─────────────────────────────────────────────────────────────────

  async function handleSaveAI() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
          ollamaBaseUrl: ollamaUrl,
          ollamaModel: ollamaModel,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('AI settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  // ─── API Key Save ─────────────────────────────────────────────────────────────

  async function handleSaveKeys() {
    // Only send keys that were actually typed (non-empty)
    const keysToSave = Object.fromEntries(
      Object.entries(apiKeyInputs).filter(([, v]) => v.trim().length > 0),
    );

    if (Object.keys(keysToSave).length === 0) {
      toast.error('No keys entered — type an API key to save it');
      return;
    }

    setSavingKeys(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys: keysToSave }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = (await res.json()) as { apiKeyStatus?: Config['apiKeyStatus'] };

      // Update config with new key status so badges refresh
      if (data.apiKeyStatus) {
        setConfig((prev) => (prev ? { ...prev, apiKeyStatus: data.apiKeyStatus } : prev));
      }

      // Clear the inputs that were saved
      setApiKeyInputs((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(keysToSave)) next[k] = '';
        return next;
      });

      toast.success('API keys saved successfully');
    } catch {
      toast.error('Failed to save API keys');
    } finally {
      setSavingKeys(false);
    }
  }

  // ─── Tavily Key Save ──────────────────────────────────────────────────────────

  async function handleSaveTavilyKey() {
    if (!tavilyKey.trim()) {
      toast.error('Enter a Tavily API key first');
      return;
    }
    setSavingKeys(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys: { tavily: tavilyKey.trim() } }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setTavilyKey('');
      toast.success('Tavily API key saved');
    } catch {
      toast.error('Failed to save Tavily key');
    } finally {
      setSavingKeys(false);
    }
  }

  async function handleTestTavily() {
    setTesting('tavily');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'tavily' }),
      });
      const data = (await res.json()) as { success: boolean; message?: string; error?: string };
      setTavilyTest({ ok: data.success, msg: data.message ?? data.error ?? 'Unknown' });
    } catch (err) {
      setTavilyTest({ ok: false, msg: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setTesting('');
    }
  }

  // ─── Connection Tests ─────────────────────────────────────────────────────────

  async function testConnection(type: 'shopify' | 'ollama') {
    setTesting(type);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: type }),
      });
      const data = (await res.json()) as {
        success: boolean;
        message?: string;
        error?: string;
        models?: string[];
      };
      if (type === 'shopify') {
        setShopifyTest({ ok: data.success, msg: data.message ?? data.error ?? 'Unknown error' });
      } else {
        setOllamaTest({
          ok: data.success,
          msg: data.message ?? data.error ?? 'Unknown error',
          models: data.models,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      if (type === 'shopify') setShopifyTest({ ok: false, msg });
      else setOllamaTest({ ok: false, msg });
    } finally {
      setTesting('');
    }
  }

  // ─── Danger Zone Actions ──────────────────────────────────────────────────────

  async function handleClearCache() {
    if (!confirm('Clear all cache? This will refetch data from Shopify on the next request.'))
      return;
    setClearingCache(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-cache' }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        toast.success(data.message ?? 'Cache cleared');
      } else {
        toast.error('Failed to clear cache');
      }
    } catch {
      toast.error('Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  }

  async function handleLogout() {
    if (!confirm('This will clear your current session. You will be redirected to the login page.'))
      return;
    setLoggingOut(true);
    try {
      // Delete the admin cookie and redirect
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/admin/login';
    } catch {
      toast.error('Failed to logout');
      setLoggingOut(false);
    }
  }

  // ─── Provider Change ──────────────────────────────────────────────────────────

  function handleProviderChange(p: Provider) {
    setSelectedProvider(p);
    if (p === 'ollama') {
      setSelectedModel(ollamaModel);
    } else {
      const models = config?.providers[p]?.models ?? [];
      setSelectedModel(models[0] ?? '');
    }
  }

  // ─── Loading State ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-[#d4a843] text-3xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (!config) return null;

  const activeProviderMeta = PROVIDER_META[selectedProvider];
  const isProviderReady =
    selectedProvider === 'ollama' || config.providers[selectedProvider]?.configured;

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          Settings
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Store configuration, integrations, and admin preferences
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — Store Information (read-only from Shopify)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="store"
          iconColor="text-[#10b981]"
          title="Store Information"
          description="Live data from your Shopify store — read only"
        />

        <div className="p-6">
          {config.storeInfo ? (
            <div className="divide-y divide-[#1f2d4e]">
              <InfoRow label="Store Name" value={config.storeInfo.name} />
              <InfoRow label="Contact Email" value={config.storeInfo.email} />
              <InfoRow label="Shopify Domain" value={config.storeInfo.domain} mono />
              <InfoRow label="Primary Domain" value={config.storeInfo.primaryDomain} mono />
              <InfoRow label="Shopify Plan" value={config.storeInfo.plan} />
              <InfoRow label="Currency" value={config.storeInfo.currency} />
              <InfoRow label="Admin API Version" value={config.storeInfo.apiVersion} mono />
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4 text-[#6b7280] text-sm">
              <span className="material-symbols-outlined text-[#374151]">cloud_off</span>
              <div>
                <p className="text-[#9ca3af] font-medium">Store info unavailable</p>
                <p className="text-xs mt-0.5">
                  Shopify Admin API credentials may be missing or invalid
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2 — Admin Configuration
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="admin_panel_settings"
          iconColor="text-[#d4a843]"
          title="Admin Configuration"
          description="Admin access, session settings, and preferences"
        />

        <div className="p-6 space-y-5">
          {/* Session Info */}
          <div className="bg-[#0d1526] rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-[#9ca3af] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#d4a843]">timer</span>
              Session Duration
            </p>
            <p className="text-sm text-white">24 hours</p>
            <p className="text-xs text-[#6b7280]">
              Admin sessions expire after 24h. JWT tokens are signed with{' '}
              <code className="bg-[#1f2d4e] px-1 rounded text-[#9ca3af]">ADMIN_JWT_SECRET</code> or{' '}
              <code className="bg-[#1f2d4e] px-1 rounded text-[#9ca3af]">ADMIN_CHAT_PASSWORD</code>.
            </p>
          </div>

          {/* Password Change Info */}
          <div className="bg-[#0d1526] rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-[#9ca3af] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#d4a843]">lock</span>
              Admin Password
            </p>
            <p className="text-xs text-[#6b7280]">
              Password is set via the{' '}
              <code className="bg-[#1f2d4e] px-1 rounded text-[#9ca3af]">ADMIN_CHAT_PASSWORD</code>{' '}
              environment variable in{' '}
              <code className="bg-[#1f2d4e] px-1 rounded text-[#9ca3af]">.env.local</code>. Restart
              the server after changing it.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-xs text-[#10b981]">Password is configured</span>
            </div>
          </div>

          {/* Theme Preference (placeholder) */}
          <div className="bg-[#0d1526] rounded-xl p-4 space-y-2 opacity-60">
            <p className="text-xs font-medium text-[#9ca3af] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#6b7280]">palette</span>
              Theme Preference
              <span className="text-[10px] bg-[#1f2d4e] text-[#6b7280] px-2 py-0.5 rounded-full font-normal">
                Coming soon
              </span>
            </p>
            <div className="flex gap-3">
              <button
                disabled
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#d4a843] bg-[#d4a843]/10 text-[#d4a843] text-xs font-medium cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">dark_mode</span>
                Dark
              </button>
              <button
                disabled
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1f2d4e] text-[#6b7280] text-xs cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">light_mode</span>
                Light
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 — API & Integrations Status
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="hub"
          iconColor="text-[#6366f1]"
          title="API & Integrations"
          description="Status of all connected services and APIs"
        />

        <div className="p-6 space-y-3">
          {/* Shopify Storefront API */}
          <div className="flex items-center justify-between py-3 px-4 bg-[#0d1526] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-[#10b981]">storefront</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">Shopify Storefront API</p>
                <p className="text-xs text-[#6b7280]">
                  Public storefront — products, cart, checkout
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusDot
                ok={config.shopify.connected}
                label={config.shopify.connected ? 'Connected' : 'Not configured'}
              />
              {config.shopify.connected && (
                <span className="text-[10px] text-[#374151] font-mono">2026-04</span>
              )}
            </div>
          </div>

          {/* Shopify Admin API */}
          <div className="flex items-center justify-between py-3 px-4 bg-[#0d1526] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-[#10b981]">
                  admin_panel_settings
                </span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">Shopify Admin API</p>
                <p className="text-xs text-[#6b7280]">Product management, orders, inventory</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusDot
                ok={config.shopify.connected}
                label={config.shopify.connected ? 'Connected' : 'Not configured'}
              />
              {config.shopify.connected && (
                <span className="text-[10px] text-[#374151] font-mono">2026-04</span>
              )}
            </div>
          </div>

          {/* AI Provider */}
          {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
            const meta = PROVIDER_META[p];
            const info = config.providers[p];
            const isActive = selectedProvider === p;
            const isReady = p === 'ollama' ? true : info.configured;

            if (!isReady && !isActive) return null;

            return (
              <div
                key={p}
                className="flex items-center justify-between py-3 px-4 bg-[#0d1526] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${meta.color}15` }}
                  >
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ color: meta.color }}
                    >
                      {meta.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium flex items-center gap-2">
                      {meta.name}
                      {isActive && (
                        <span className="text-[10px] bg-[#d4a843]/10 text-[#d4a843] px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#6b7280]">
                      {isActive
                        ? `Model: ${selectedModel || config.model}`
                        : 'Configured, not active'}
                    </p>
                  </div>
                </div>
                <StatusDot ok={isReady} label={isReady ? 'Ready' : 'No API key'} />
              </div>
            );
          })}

          {/* AutoDS */}
          <div className="flex items-center justify-between py-3 px-4 bg-[#0d1526] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#374151]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-[#6b7280]">
                  inventory_2
                </span>
              </div>
              <div>
                <p className="text-sm text-white font-medium">AutoDS Integration</p>
                <p className="text-xs text-[#6b7280]">Dropshipping & product sourcing</p>
              </div>
            </div>
            <StatusDot ok={false} label="Not connected" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4 — AI Provider Configuration
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="smart_toy"
          iconColor="text-[#d4a843]"
          title="AI Provider"
          description="Choose which AI powers your admin assistant"
        />

        <div className="p-6 space-y-6">
          {/* Provider Cards */}
          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
              const meta = PROVIDER_META[p];
              const info = config.providers[p];
              const isSelected = selectedProvider === p;
              const isReady = p === 'ollama' || info.configured;

              const keyStatus = p !== 'ollama' ? config.apiKeyStatus?.[p] : null;
              const keySource = keyStatus?.source ?? null;

              return (
                <button
                  key={p}
                  onClick={() => handleProviderChange(p)}
                  className={`relative text-left rounded-xl p-4 border-2 transition-all ${
                    isSelected
                      ? 'border-[#d4a843] bg-[#d4a843]/5'
                      : 'border-[#1f2d4e] hover:border-[#374151] bg-[#0d1526]'
                  }`}
                >
                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    {isReady ? (
                      <span
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                          keySource === 'runtime'
                            ? 'text-[#d4a843] bg-[#d4a843]/10'
                            : 'text-[#10b981] bg-[#10b981]/10'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            keySource === 'runtime' ? 'bg-[#d4a843]' : 'bg-[#10b981]'
                          }`}
                        />
                        Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-[#6b7280] bg-[#6b7280]/10 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6b7280]" />
                        No key
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${meta.color}15` }}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ color: meta.color }}
                      >
                        {meta.icon}
                      </span>
                    </div>
                    <div className="text-white font-medium text-sm">{meta.name}</div>
                  </div>

                  <p className="text-[#6b7280] text-xs leading-relaxed">{meta.description}</p>

                  {!isReady && meta.envKey && (
                    <p className="text-[#374151] text-[10px] mt-2 font-mono">
                      Add key below or set {meta.envKey}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── API Keys ──────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[#9ca3af] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[#d4a843]">key</span>
              API Keys
              <span className="text-[10px] bg-[#1f2d4e] text-[#6b7280] px-2 py-0.5 rounded-full font-normal">
                stored server-side, never exposed
              </span>
            </h3>

            {(['claude', 'openai', 'gemini'] as const).map((p) => {
              const meta = PROVIDER_META[p];
              const status = config.apiKeyStatus?.[p];
              const isKeySet = status?.configured ?? config.providers[p].configured;
              const inputVal = apiKeyInputs[p] ?? '';
              const isVisible = showKeys[p] ?? false;

              const GUIDE_DATA: Record<
                'claude' | 'openai' | 'gemini',
                {
                  why: string;
                  steps: string[];
                  pricing: string;
                  pricingNote: string;
                  links: { text: string; href: string }[];
                  recommended?: boolean;
                }
              > = {
                claude: {
                  recommended: true,
                  why: 'Best tool calling and reasoning. Handles complex Shopify operations accurately.',
                  steps: [
                    'Go to <a href="https://console.anthropic.com" target="_blank" rel="noopener" class="text-[#d4a843] hover:underline">console.anthropic.com</a>',
                    'Create a free account',
                    'Go to <strong>API Keys → Create Key</strong>',
                    'Copy the key — it starts with <code class="bg-[#1f2d4e] px-1 rounded text-[#9ca3af]">sk-ant-</code>',
                    'Paste it in the field below',
                  ],
                  pricing: '$3/MTok input, $15/MTok output. ~$0.02 per chat message average.',
                  pricingNote: '$5 free credit on signup — enough for ~250 messages.',
                  links: [{ text: 'console.anthropic.com', href: 'https://console.anthropic.com' }],
                },
                openai: {
                  why: 'GPT-4o is fast and reliable for general tasks. Good alternative to Claude.',
                  steps: [
                    'Go to <a href="https://platform.openai.com" target="_blank" rel="noopener" class="text-[#d4a843] hover:underline">platform.openai.com</a>',
                    'Create a free account',
                    'Go to <strong>API Keys → Create new secret key</strong>',
                    'Copy the key — it starts with <code class="bg-[#1f2d4e] px-1 rounded text-[#9ca3af]">sk-</code>',
                    'Paste it in the field below',
                  ],
                  pricing: '$2.50/MTok input, $10/MTok output. ~$0.01 per chat message average.',
                  pricingNote: '$5 free credit on signup.',
                  links: [{ text: 'platform.openai.com', href: 'https://platform.openai.com' }],
                },
                gemini: {
                  why: 'Good for image analysis and multimodal tasks. Very generous free tier.',
                  steps: [
                    'Go to <a href="https://aistudio.google.com" target="_blank" rel="noopener" class="text-[#d4a843] hover:underline">aistudio.google.com</a>',
                    'Sign in with your Google account',
                    'Click <strong>"Get API Key" → Create API key</strong>',
                    'Copy the key',
                    'Paste it in the field below',
                  ],
                  pricing: 'Free tier: 15 RPM, 1 million tokens/min. Paid: $0.075/MTok.',
                  pricingNote: 'Very generous — 15 requests/minute completely free!',
                  links: [{ text: 'aistudio.google.com', href: 'https://aistudio.google.com' }],
                },
              };

              const guide = GUIDE_DATA[p];

              return (
                <div key={p} className="bg-[#0d1526] rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-sm"
                        style={{ color: meta.color }}
                      >
                        {meta.icon}
                      </span>
                      <span className="text-sm text-white font-medium">{meta.name}</span>
                      {guide.recommended && (
                        <span className="bg-[#d4a843]/10 text-[#d4a843] text-[10px] px-2 py-0.5 rounded-full font-medium">
                          ⭐ Recommended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isKeySet && status && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                            status.source === 'runtime'
                              ? 'bg-[#d4a843]/10 text-[#d4a843]'
                              : 'bg-[#10b981]/10 text-[#10b981]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status.source === 'runtime' ? 'bg-[#d4a843]' : 'bg-[#10b981]'
                            }`}
                          />
                          {status.source === 'runtime' ? 'Runtime key' : 'Env var'}
                        </span>
                      )}
                      {!isKeySet && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ef4444]/10 text-[#ef4444] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                          Not set
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Why this provider */}
                  <p className="text-[10px] text-[#6b7280] italic">{guide.why}</p>

                  {/* Setup Guide (collapsible) */}
                  <SetupGuide
                    open={guideOpen[p] ?? false}
                    onToggle={() => setGuideOpen((prev) => ({ ...prev, [p]: !prev[p] }))}
                    steps={guide.steps}
                    pricing={guide.pricing}
                    pricingNote={guide.pricingNote}
                    links={guide.links}
                  />

                  {/* Masked current key */}
                  {isKeySet && status?.masked && (
                    <p className="text-[11px] font-mono text-[#6b7280] bg-[#111827] px-3 py-1.5 rounded-lg">
                      Current: {status.masked}
                    </p>
                  )}

                  {/* Input for new key */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={isVisible ? 'text' : 'password'}
                        value={inputVal}
                        onChange={(e) =>
                          setApiKeyInputs((prev) => ({ ...prev, [p]: e.target.value }))
                        }
                        placeholder={
                          isKeySet
                            ? `Enter new ${meta.name} key to replace...`
                            : `Enter ${meta.name} API key...`
                        }
                        className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white rounded-xl px-4 py-2.5 text-sm font-mono outline-none pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys((prev) => ({ ...prev, [p]: !isVisible }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#9ca3af] transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">
                          {isVisible ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#374151] font-mono">Env: {meta.envKey}</p>
                </div>
              );
            })}

            {/* Save Keys Button */}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveKeys}
                disabled={savingKeys}
                className="bg-[#1f2d4e] hover:bg-[#2a3d5e] disabled:bg-[#1f2d4e]/50 text-[#d4a843] border border-[#d4a843]/30 font-semibold rounded-xl px-6 py-2.5 text-sm transition-colors flex items-center gap-2"
              >
                {savingKeys ? (
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-base">key</span>
                )}
                Save Keys
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <h3 className="text-xs font-medium text-[#9ca3af] mb-3 flex items-center gap-2">
              <span
                className="material-symbols-outlined text-sm"
                style={{ color: activeProviderMeta.color }}
              >
                {activeProviderMeta.icon}
              </span>
              {activeProviderMeta.name} — Model
            </h3>

            {selectedProvider === 'ollama' ? (
              <div className="space-y-3">
                {/* Ollama Setup Guide */}
                <div className="bg-[#0d1526] rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-sm text-[#f97316]">
                      computer
                    </span>
                    <span className="text-xs text-[#9ca3af] font-medium">
                      Ollama — Free &amp; Private
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6b7280] italic mb-1">
                    Run AI on your own computer. Completely free, no data leaves your machine.
                  </p>
                  <SetupGuide
                    open={guideOpen['ollama'] ?? false}
                    onToggle={() => setGuideOpen((prev) => ({ ...prev, ollama: !prev['ollama'] }))}
                    steps={[
                      'Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener" class="text-[#d4a843] hover:underline">ollama.com</a>',
                      'Run <code class="bg-[#1f2d4e] px-1 rounded text-[#9ca3af] font-mono">ollama pull llama3.1:8b</code> in your terminal',
                      'Make sure Ollama is running — the app icon should appear in your menu bar',
                      'Set the URL below (default: <code class="bg-[#1f2d4e] px-1 rounded text-[#9ca3af] font-mono">http://localhost:11434</code>)',
                    ]}
                    pricing="Free — uses your computer's GPU/CPU."
                    freeNote="8GB RAM minimum, 16GB recommended for best performance."
                    links={[{ text: 'ollama.com', href: 'https://ollama.com' }]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                    Ollama Server URL
                  </label>
                  <div className="flex gap-3">
                    <input
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="flex-1 bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] text-white rounded-xl px-4 py-2.5 text-sm outline-none"
                    />
                    <button
                      onClick={() => testConnection('ollama')}
                      disabled={testing === 'ollama'}
                      className="bg-[#f97316]/10 hover:bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {testing === 'ollama' ? (
                        <span className="material-symbols-outlined text-base animate-spin">
                          progress_activity
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-base">bolt</span>
                      )}
                      Test
                    </button>
                  </div>
                  {ollamaTest && (
                    <div
                      className={`mt-2 text-xs flex items-center gap-1 ${ollamaTest.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {ollamaTest.ok ? 'check_circle' : 'error'}
                      </span>
                      {ollamaTest.msg}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Model</label>
                  <div className="grid grid-cols-2 gap-2">
                    {config.providers.ollama.models.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setOllamaModel(m);
                          setSelectedModel(m);
                        }}
                        className={`text-left rounded-lg px-3 py-2 text-sm border transition-colors ${
                          ollamaModel === m
                            ? 'border-[#f97316] bg-[#f97316]/10 text-white'
                            : 'border-[#1f2d4e] text-[#9ca3af] hover:border-[#374151]'
                        }`}
                      >
                        <span className="font-mono text-xs">{m}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    value={ollamaModel}
                    onChange={(e) => {
                      setOllamaModel(e.target.value);
                      setSelectedModel(e.target.value);
                    }}
                    placeholder="Or type custom model name..."
                    className="w-full mt-2 bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] text-white rounded-lg px-3 py-2 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-2">
                  {config.providers[selectedProvider].models.map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedModel(m)}
                      className="text-left rounded-lg px-3 py-2 text-sm border transition-colors border-[#1f2d4e] text-[#9ca3af] hover:border-[#374151]"
                      style={
                        selectedModel === m
                          ? {
                              borderColor: activeProviderMeta.color,
                              backgroundColor: `${activeProviderMeta.color}15`,
                              color: 'white',
                            }
                          : {}
                      }
                    >
                      <span className="font-mono text-xs">{m}</span>
                    </button>
                  ))}
                </div>

                {!isProviderReady && (
                  <div className="mt-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-3 text-xs text-[#ef4444] flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5">warning</span>
                    <div>
                      <strong>API key missing.</strong> Enter the key in the{' '}
                      <strong>API Keys</strong> section above, or set{' '}
                      <code className="bg-[#ef4444]/10 px-1 rounded">
                        {activeProviderMeta.envKey}
                      </code>{' '}
                      in <code>.env.local</code>.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Shopify Test */}
          <div className="bg-[#0d1526] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#9ca3af]">Shopify Connection Test</p>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  Verify your Shopify Admin API credentials are working
                </p>
              </div>
              <button
                onClick={() => testConnection('shopify')}
                disabled={testing === 'shopify' || !config.shopify.connected}
                className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {testing === 'shopify' ? (
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-base">bolt</span>
                )}
                Test Connection
              </button>
            </div>
            {shopifyTest && (
              <div
                className={`text-xs flex items-center gap-1 ${shopifyTest.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}
              >
                <span className="material-symbols-outlined text-sm">
                  {shopifyTest.ok ? 'check_circle' : 'error'}
                </span>
                {shopifyTest.msg}
              </div>
            )}
          </div>

          {/* Save AI Settings */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveAI}
              disabled={saving}
              className="bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] text-[#0a0f1e] font-semibold rounded-xl px-8 py-3 text-sm transition-colors flex items-center gap-2"
            >
              {saving ? (
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-base">save</span>
              )}
              Save AI Settings
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5 — Market Research Configuration
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="manage_search"
          iconColor="text-[#6366f1]"
          title="Market Research Configuration"
          description="Choose how the Market Intelligence feature searches the web for product data"
        />

        <div className="p-6 space-y-4">
          {/* Search Mode Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Free Search Card */}
            <button
              type="button"
              onClick={() => setSearchMode('free')}
              className={`relative text-left rounded-xl p-4 border-2 transition-all ${
                searchMode === 'free'
                  ? 'border-[#10b981] bg-[#10b981]/5'
                  : 'border-[#1f2d4e] hover:border-[#374151] bg-[#0d1526]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl">🆓</span>
                <span className="text-[10px] bg-[#10b981]/10 text-[#10b981] px-2 py-0.5 rounded-full font-medium">
                  No API key needed
                </span>
              </div>
              <p className="text-sm text-white font-medium mb-1">Free Search</p>
              <p className="text-[10px] text-[#6b7280] leading-relaxed mb-3">
                Uses DuckDuckGo web scraping for product research. Good for getting started, but
                results may be limited.
              </p>
              <div className="space-y-1">
                <p className="text-[10px] text-[#10b981]">✓ Free — no setup required</p>
                <p className="text-[10px] text-[#10b981]">✓ Works immediately</p>
                <p className="text-[10px] text-[#374151]">✗ Slower, may get rate-limited</p>
                <p className="text-[10px] text-[#374151]">✗ Less accurate results</p>
              </div>
            </button>

            {/* Tavily Pro Card */}
            <button
              type="button"
              onClick={() => setSearchMode('tavily')}
              className={`relative text-left rounded-xl p-4 border-2 transition-all ${
                searchMode === 'tavily'
                  ? 'border-[#6366f1] bg-[#6366f1]/5'
                  : 'border-[#1f2d4e] hover:border-[#374151] bg-[#0d1526]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl">⚡</span>
                <span className="text-[10px] bg-[#ef4444]/10 text-[#ef4444] px-2 py-0.5 rounded-full font-medium">
                  API key required
                </span>
              </div>
              <p className="text-sm text-white font-medium mb-1">Tavily Pro Search</p>
              <p className="text-[10px] text-[#6b7280] leading-relaxed mb-3">
                Professional search API with deep web analysis. More accurate results, faster,
                better for serious research.
              </p>
              <div className="space-y-1">
                <p className="text-[10px] text-[#10b981]">✓ Fast, accurate, structured results</p>
                <p className="text-[10px] text-[#10b981]">✓ Includes answer summaries</p>
                <p className="text-[10px] text-[#374151]">✗ ~$0.01 per search</p>
                <p className="text-[10px] text-[#374151]">✗ ~$0.12 per full research session</p>
              </div>
            </button>
          </div>

          {/* Tavily Setup (expanded when tavily mode selected) */}
          {searchMode === 'tavily' && (
            <div className="bg-[#0d1526] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#6366f1]">bolt</span>
                <span className="text-sm text-white font-medium">Tavily API Key</span>
              </div>

              <SetupGuide
                open={tavilyGuideOpen}
                onToggle={() => setTavilyGuideOpen((v) => !v)}
                steps={[
                  'Go to <a href="https://tavily.com" target="_blank" rel="noopener" class="text-[#d4a843] hover:underline">tavily.com</a> and click <strong>"Get API Key"</strong>',
                  'Create a free account — <strong>1,000 free searches/month</strong> included',
                  'Copy your API key from the dashboard',
                  'Paste it in the field below and click Save',
                ]}
                pricing="~$0.01 per search. ~$0.12 per full research session (12 searches avg)."
                pricingNote="1,000 free searches/month on the free tier — enough for ~83 research sessions!"
              />

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showTavilyKey ? 'text' : 'password'}
                    value={tavilyKey}
                    onChange={(e) => setTavilyKey(e.target.value)}
                    placeholder="tvly-..."
                    className="w-full bg-[#0a0f1e] border border-[#1f2d4e] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] text-white rounded-xl px-4 py-2.5 text-sm font-mono outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTavilyKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] hover:text-[#9ca3af] transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showTavilyKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleTestTavily}
                  disabled={testing === 'tavily'}
                  className="bg-[#6366f1]/10 hover:bg-[#6366f1]/20 text-[#6366f1] border border-[#6366f1]/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {testing === 'tavily' ? (
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base">bolt</span>
                  )}
                  Test
                </button>
                <button
                  type="button"
                  onClick={handleSaveTavilyKey}
                  disabled={savingKeys || !tavilyKey.trim()}
                  className="bg-[#1f2d4e] hover:bg-[#2a3d5e] disabled:opacity-40 text-[#d4a843] border border-[#d4a843]/30 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {savingKeys ? (
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base">save</span>
                  )}
                  Save
                </button>
              </div>

              {tavilyTest && (
                <div
                  className={`text-xs flex items-center gap-1 ${tavilyTest.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {tavilyTest.ok ? 'check_circle' : 'error'}
                  </span>
                  {tavilyTest.msg}
                </div>
              )}

              <p className="text-[10px] text-[#374151] font-mono">Env: TAVILY_API_KEY</p>
            </div>
          )}

          {/* Mode info pill */}
          <div
            className={`flex items-center gap-2 text-xs px-4 py-2 rounded-xl ${
              searchMode === 'free'
                ? 'bg-[#10b981]/5 text-[#10b981] border border-[#10b981]/20'
                : 'bg-[#6366f1]/5 text-[#6366f1] border border-[#6366f1]/20'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {searchMode === 'free' ? 'check_circle' : 'bolt'}
            </span>
            {searchMode === 'free'
              ? 'Market Intelligence will use DuckDuckGo (free mode). No key needed.'
              : 'Market Intelligence will use Tavily Pro when a key is configured.'}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 7 — Environment Variables Reference
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="key"
          iconColor="text-[#6b7280]"
          title="Environment Variables"
          description="API keys stored in .env.local — never in the database"
        />

        <div className="p-6">
          <div className="bg-[#0d1526] rounded-xl overflow-hidden font-mono text-xs">
            {[
              {
                key: 'ANTHROPIC_API_KEY',
                label: 'Claude AI',
                configured: config.providers.claude.configured,
              },
              {
                key: 'OPENAI_API_KEY',
                label: 'OpenAI',
                configured: config.providers.openai.configured,
              },
              {
                key: 'GOOGLE_GENERATIVE_AI_API_KEY',
                label: 'Gemini',
                configured: config.providers.gemini.configured,
              },
              {
                key: 'SHOPIFY_STORE_DOMAIN',
                label: 'Shopify',
                configured: !!config.shopify.domain,
              },
              { key: 'SHOPIFY_CLIENT_ID', label: 'Shopify', configured: !!config.shopify.clientId },
              {
                key: 'SHOPIFY_CLIENT_SECRET',
                label: 'Shopify',
                configured: config.shopify.hasClientSecret,
              },
              { key: 'ADMIN_CHAT_PASSWORD', label: 'Admin', configured: true },
              { key: 'ADMIN_JWT_SECRET', label: 'Admin (optional)', configured: true },
            ].map((env) => (
              <div
                key={env.key}
                className="flex items-center justify-between px-4 py-2.5 border-b border-[#1f2d4e] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${env.configured ? 'bg-[#10b981]' : 'bg-[#374151]'}`}
                  />
                  <span className="text-[#9ca3af]">{env.key}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#374151]">{env.label}</span>
                  <span
                    className={`text-[10px] ${env.configured ? 'text-[#10b981]' : 'text-[#374151]'}`}
                  >
                    {env.configured ? 'Set' : 'Missing'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 8 — Danger Zone
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#111827] border border-[#ef4444]/30 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#ef4444]/20 bg-[#ef4444]/5">
          <h2 className="text-[#ef4444] font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ef4444]">dangerous</span>
            Danger Zone
          </h2>
          <p className="text-[#ef4444]/60 text-xs mt-1">
            These actions are irreversible — proceed with caution
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Clear Cache */}
          <div className="flex items-center justify-between p-4 border border-[#ef4444]/20 rounded-xl bg-[#ef4444]/5">
            <div>
              <p className="text-sm text-white font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#ef4444]">
                  delete_sweep
                </span>
                Clear All Cache
              </p>
              <p className="text-xs text-[#6b7280] mt-1">
                Invalidates all Shopify data cache. Next requests will refetch from the API.
              </p>
            </div>
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="shrink-0 ml-4 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 rounded-xl px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {clearingCache ? (
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-base">delete_sweep</span>
              )}
              Clear Cache
            </button>
          </div>

          {/* Logout / Revoke Session */}
          <div className="flex items-center justify-between p-4 border border-[#ef4444]/20 rounded-xl bg-[#ef4444]/5">
            <div>
              <p className="text-sm text-white font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#ef4444]">logout</span>
                Logout from All Sessions
              </p>
              <p className="text-xs text-[#6b7280] mt-1">
                Clears your admin session cookie. You will be redirected to the login page. Other
                active sessions using the same browser will also be invalidated.
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="shrink-0 ml-4 bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 rounded-xl px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loggingOut ? (
                <span className="material-symbols-outlined text-base animate-spin">
                  progress_activity
                </span>
              ) : (
                <span className="material-symbols-outlined text-base">logout</span>
              )}
              Logout
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
