'use client';

/**
 * Admin Settings page — privada, data live (providers, API keys, Shopify connection).
 * `force-dynamic` evita que Next intente prerenderearla como SSG estática.
 * El prerender fallaba con "Cannot read properties of null (reading 'use')"
 * al serializar estado client-only durante el build.
 * Mismo patrón que /admin/page.tsx (dashboard).
 */
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/useToast';
import { useAdminTheme, type AdminTheme } from '@/components/admin/ThemeProvider';

// ─── Types ──────────────────────────────────────────────────────────────────────

type Provider = 'claude' | 'openai' | 'gemini' | 'ollama';

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
  apiKeyStatus?: Record<'claude' | 'openai' | 'gemini' | 'tavily', ApiKeyStatus>;
};

// ─── Trend Provider Types ──────────────────────────────────────────────────────

type TrendProviderId = 'serpapi' | 'pytrends' | 'tavily' | 'amazon' | 'meta';
type TrendKeyId =
  | 'serpapi'
  | 'amazon-access-key'
  | 'amazon-secret-key'
  | 'amazon-partner-tag'
  | 'meta-access-token';

type TrendKeyStatus = {
  configured: boolean;
  source: 'env' | 'runtime' | null;
  masked: string;
};

type TrendProviderStatus = {
  id: TrendProviderId;
  name: string;
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
  enabled: boolean;
  hasKey: boolean;
};

type TrendConfigState = {
  activeStrategy: 'smart-merge' | 'primary-only' | 'fallback-chain';
  enabledProviders: TrendProviderId[];
  cacheEnabled: boolean;
  cacheTTL: number;
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
    color: 'var(--admin-success)',
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

// ─── Trend Engine Config (types above) ─────────────────────────────────────────

// ─── Trend Provider Metadata ───────────────────────────────────────────────────

const TREND_PROVIDER_META: Record<
  TrendProviderId,
  {
    name: string;
    icon: string;
    color: string;
    reliability: 'HIGH' | 'MEDIUM' | 'LOW';
    cost: string;
    description: string;
    requiresKey: boolean;
    keyFields: { id: TrendKeyId; label: string; placeholder: string }[];
  }
> = {
  serpapi: {
    name: 'SerpAPI',
    icon: 'search',
    color: 'var(--admin-success)',
    reliability: 'HIGH',
    cost: '~$0.01/search',
    description: 'Google Trends + SERP data. Most reliable, highest accuracy.',
    requiresKey: true,
    keyFields: [{ id: 'serpapi', label: 'API Key', placeholder: 'serpapi-...' }],
  },
  pytrends: {
    name: 'PyTrends',
    icon: 'trending_up',
    color: '#6366f1',
    reliability: 'MEDIUM',
    cost: 'Free',
    description: 'Google Trends unofficial API. No key required, rate-limited.',
    requiresKey: false,
    keyFields: [],
  },
  tavily: {
    name: 'Tavily',
    icon: 'travel_explore',
    color: 'var(--admin-warning)',
    reliability: 'MEDIUM',
    cost: '~$0.01/search',
    description: 'Web search trend signals. Uses your shared Tavily AI key.',
    requiresKey: false,
    keyFields: [],
  },
  amazon: {
    name: 'Amazon',
    icon: 'storefront',
    color: '#f97316',
    reliability: 'HIGH',
    cost: 'Free (PA API)',
    description: 'Amazon bestseller & price data. Requires Product Advertising API.',
    requiresKey: true,
    keyFields: [
      { id: 'amazon-access-key', label: 'Access Key', placeholder: 'AKIA...' },
      { id: 'amazon-secret-key', label: 'Secret Key', placeholder: 'secret...' },
      { id: 'amazon-partner-tag', label: 'Partner Tag', placeholder: 'partner-20' },
    ],
  },
  meta: {
    name: 'Meta Ads',
    icon: 'ads_click',
    color: 'var(--admin-info)',
    reliability: 'LOW',
    cost: 'Free',
    description: 'Facebook/Instagram ad trend signals. Requires Meta access token.',
    requiresKey: true,
    keyFields: [{ id: 'meta-access-token', label: 'Access Token', placeholder: 'EAAg...' }],
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
        className="flex items-center gap-1.5 text-[10px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] transition-colors"
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
        <div className="mt-2 bg-[var(--admin-bg)]/50 rounded-xl p-4 space-y-3">
          <ol className="space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-[var(--admin-text-secondary)]">
                <span className="font-mono text-xs text-[var(--admin-text-disabled)] shrink-0 w-4">
                  {i + 1}.
                </span>
                <span dangerouslySetInnerHTML={{ __html: step }} />
              </li>
            ))}
          </ol>
          {pricing && (
            <p className="text-[var(--admin-text-disabled)] text-[10px] border-t border-[var(--admin-border)] pt-2">
              💰 {pricing}
            </p>
          )}
          {pricingNote && (
            <p className="text-[var(--admin-text-disabled)] text-[10px]">🎁 {pricingNote}</p>
          )}
          {freeNote && <p className="text-[var(--admin-success)] text-[10px]">✅ {freeNote}</p>}
          {links && (
            <div className="flex gap-3 flex-wrap pt-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[var(--admin-brand)] hover:underline flex items-center gap-1"
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
  iconColor = 'text-[var(--admin-brand)]',
  title,
  description,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="px-6 py-4 border-b border-[var(--admin-border)]">
      <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--admin-text)' }}>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
        {title}
      </h2>
      {description && <p className="text-[var(--admin-text-muted)] text-xs mt-1">{description}</p>}
    </div>
  );
}

// ─── Status Dot Component ──────────────────────────────────────────────────────

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`flex items-center gap-1.5 text-xs ${ok ? 'text-[var(--admin-success)]' : 'text-[var(--admin-error)]'}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${ok ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-error)]'}`}
      />
      {label}
    </span>
  );
}

// ─── Toggle Component ──────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
  size = 'md',
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  size?: 'sm' | 'md';
}) {
  const w = size === 'sm' ? 'w-10 h-[22px]' : 'w-12 h-[26px]';
  const dot = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const move = size === 'sm' ? 'translate-x-[18px]' : 'translate-x-[22px]';

  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex ${w} items-center rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-border-hover)]'
      }`}
    >
      <span
        className={`inline-block ${dot} rounded-full bg-white shadow-md transform transition-transform duration-200 ${
          enabled ? move : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

// ─── Info Row Component ────────────────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--admin-border)] last:border-0">
      <span className="text-xs text-[var(--admin-text-muted)]">{label}</span>
      <span className={`text-sm text-[var(--admin-text-body)] ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme: currentTheme, resolvedTheme, setTheme: setAdminTheme } = useAdminTheme();

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
    tavily: '',
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    claude: false,
    openai: false,
    gemini: false,
    tavily: false,
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

  // ── Trend Engine state ──────────────────────────────────────────────────────
  const [trendConfig, setTrendConfig] = useState<TrendConfigState | null>(null);
  const [trendProviders, setTrendProviders] = useState<TrendProviderStatus[]>([]);
  const [trendKeyStatuses, setTrendKeyStatuses] = useState<Record<
    TrendKeyId,
    TrendKeyStatus
  > | null>(null);
  const [trendKeyInputs, setTrendKeyInputs] = useState<Record<TrendKeyId, string>>({
    serpapi: '',
    'amazon-access-key': '',
    'amazon-secret-key': '',
    'amazon-partner-tag': '',
    'meta-access-token': '',
  });
  const [trendShowKeys, setTrendShowKeys] = useState<Record<TrendKeyId, boolean>>({
    serpapi: false,
    'amazon-access-key': false,
    'amazon-secret-key': false,
    'amazon-partner-tag': false,
    'meta-access-token': false,
  });
  const [trendTestResults, setTrendTestResults] = useState<
    Record<string, { ok: boolean; latency: number; error?: string } | null>
  >({});
  const [trendTesting, setTrendTesting] = useState('');
  const [savingTrendConfig, setSavingTrendConfig] = useState(false);
  const [savingTrendKey, setSavingTrendKey] = useState('');

  // Market Research state
  const [searchModes, setSearchModes] = useState({ free: true, tavily: false });
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
      .then((data: Config & { searchModes?: { free: boolean; tavily: boolean } }) => {
        setConfig(data);
        setSelectedProvider(data.provider);
        setSelectedModel(data.model);
        setOllamaUrl(data.ollama.baseUrl);
        setOllamaModel(data.ollama.model);
        if (data.searchModes) setSearchModes(data.searchModes);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [toast]);

  // ─── Trend Config Load ────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/trends/config').then((r) => r.json()),
      fetch('/api/admin/trends/keys').then((r) => r.json()),
    ])
      .then(
        ([cfgData, keysData]: [
          { config?: TrendConfigState; providers?: TrendProviderStatus[] },
          { keys?: Record<TrendKeyId, TrendKeyStatus> },
        ]) => {
          if (cfgData.config) setTrendConfig(cfgData.config);
          if (cfgData.providers) setTrendProviders(cfgData.providers);
          if (keysData.keys) setTrendKeyStatuses(keysData.keys);
        },
      )
      .catch(() => {
        /* trend config is optional — no error toast needed */
      });
  }, []);

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

  // ─── Search Modes Save ────────────────────────────────────────────────────────

  async function handleSaveSearchModes(modes: { free: boolean; tavily: boolean }) {
    setSearchModes(modes);
    try {
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchModes: modes }),
      });
      toast.success('Search mode updated');
    } catch {
      toast.error('Failed to save search mode');
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

  // ─── Trend Handlers ───────────────────────────────────────────────────────────

  async function handleSaveTrendConfig() {
    if (!trendConfig) return;
    setSavingTrendConfig(true);
    try {
      const res = await fetch('/api/admin/trends/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy: trendConfig.activeStrategy,
          enabledProviders: trendConfig.enabledProviders,
          cacheEnabled: trendConfig.cacheEnabled,
          cacheTTL: trendConfig.cacheTTL,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as { config?: TrendConfigState };
      if (data.config) setTrendConfig(data.config);
      toast.success('Trend settings saved');
    } catch {
      toast.error('Failed to save trend settings');
    } finally {
      setSavingTrendConfig(false);
    }
  }

  function handleToggleTrendProvider(id: TrendProviderId, enabled: boolean) {
    setTrendProviders((prev) => prev.map((p) => (p.id === id ? { ...p, enabled } : p)));
    setTrendConfig((prev) => {
      if (!prev) return prev;
      const enabledProviders = enabled
        ? ([...prev.enabledProviders, id] as TrendProviderId[])
        : prev.enabledProviders.filter((p) => p !== id);
      return { ...prev, enabledProviders };
    });
  }

  async function handleSaveTrendKey(keyId: TrendKeyId) {
    const key = trendKeyInputs[keyId];
    if (!key.trim()) {
      toast.error('Enter a key first');
      return;
    }
    setSavingTrendKey(keyId);
    try {
      const res = await fetch('/api/admin/trends/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: keyId, key: key.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as { status?: TrendKeyStatus };
      if (data.status) {
        setTrendKeyStatuses((prev) => (prev ? { ...prev, [keyId]: data.status! } : prev));
      }
      setTrendKeyInputs((prev) => ({ ...prev, [keyId]: '' }));
      toast.success('Key saved');
    } catch {
      toast.error('Failed to save key');
    } finally {
      setSavingTrendKey('');
    }
  }

  async function handleTestTrendProvider(providerId: TrendProviderId) {
    setTrendTesting(providerId);
    try {
      const res = await fetch('/api/admin/trends/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId }),
      });
      const data = (await res.json()) as { success: boolean; latency: number; error?: string };
      setTrendTestResults((prev) => ({
        ...prev,
        [providerId]: { ok: data.success, latency: data.latency, error: data.error },
      }));
    } catch (err) {
      setTrendTestResults((prev) => ({
        ...prev,
        [providerId]: {
          ok: false,
          latency: 0,
          error: err instanceof Error ? err.message : 'Failed',
        },
      }));
    } finally {
      setTrendTesting('');
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
        <span className="material-symbols-outlined text-[var(--admin-brand)] text-3xl animate-spin">
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
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--admin-text)' }}
        >
          Settings
        </h1>
        <p className="text-[var(--admin-text-muted)] text-sm mt-1">
          Store configuration, integrations, and admin preferences
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1 — Store Information (read-only from Shopify)
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="store"
          iconColor="text-[var(--admin-success)]"
          title="Store Information"
          description="Live data from your Shopify store — read only"
        />

        <div className="p-6">
          {config.storeInfo ? (
            <div className="divide-y divide-[var(--admin-border)]">
              <InfoRow label="Store Name" value={config.storeInfo.name} />
              <InfoRow label="Contact Email" value={config.storeInfo.email} />
              <InfoRow label="Shopify Domain" value={config.storeInfo.domain} mono />
              <InfoRow label="Primary Domain" value={config.storeInfo.primaryDomain} mono />
              <InfoRow label="Shopify Plan" value={config.storeInfo.plan} />
              <InfoRow label="Currency" value={config.storeInfo.currency} />
              <InfoRow label="Admin API Version" value={config.storeInfo.apiVersion} mono />
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4 text-[var(--admin-text-muted)] text-sm">
              <span className="material-symbols-outlined text-[var(--admin-text-disabled)]">
                cloud_off
              </span>
              <div>
                <p className="text-[var(--admin-text-secondary)] font-medium">
                  Store info unavailable
                </p>
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
      <section className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="admin_panel_settings"
          iconColor="text-[var(--admin-brand)]"
          title="Admin Configuration"
          description="Admin access, session settings, and preferences"
        />

        <div className="p-6 space-y-5">
          {/* Session Info */}
          <div className="bg-[var(--admin-bg-elevated)] rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-[var(--admin-text-secondary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[var(--admin-brand)]">
                timer
              </span>
              Session Duration
            </p>
            <p className="text-sm text-[var(--admin-text)]">24 hours</p>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Admin sessions expire after 24h. JWT tokens are signed with{' '}
              <code className="bg-[var(--admin-border)] px-1 rounded text-[var(--admin-text-secondary)]">
                ADMIN_JWT_SECRET
              </code>{' '}
              or{' '}
              <code className="bg-[var(--admin-border)] px-1 rounded text-[var(--admin-text-secondary)]">
                ADMIN_CHAT_PASSWORD
              </code>
              .
            </p>
          </div>

          {/* Password Change Info */}
          <div className="bg-[var(--admin-bg-elevated)] rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-[var(--admin-text-secondary)] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-[var(--admin-brand)]">
                lock
              </span>
              Admin Password
            </p>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Password is set via the{' '}
              <code className="bg-[var(--admin-border)] px-1 rounded text-[var(--admin-text-secondary)]">
                ADMIN_CHAT_PASSWORD
              </code>{' '}
              environment variable in{' '}
              <code className="bg-[var(--admin-border)] px-1 rounded text-[var(--admin-text-secondary)]">
                .env.local
              </code>
              . Restart the server after changing it.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[var(--admin-success)]" />
              <span className="text-xs text-[var(--admin-success)]">Password is configured</span>
            </div>
          </div>

          {/* Theme Preference */}
          <div className="bg-[var(--admin-bg-elevated)] rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-[var(--admin-text-secondary)] flex items-center gap-2">
              <span
                className="material-symbols-outlined text-sm"
                style={{ color: 'var(--admin-brand)' }}
              >
                palette
              </span>
              Theme Preference
            </p>
            <div className="flex gap-3">
              {[
                { value: 'dark' as AdminTheme, icon: 'dark_mode', label: 'Dark' },
                { value: 'light' as AdminTheme, icon: 'light_mode', label: 'Light' },
                { value: 'system' as AdminTheme, icon: 'monitor', label: 'System' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAdminTheme(opt.value)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                  style={
                    currentTheme === opt.value
                      ? {
                          borderColor: 'var(--admin-brand)',
                          backgroundColor:
                            'color-mix(in srgb, var(--admin-brand) 10%, transparent)',
                          color: 'var(--admin-brand)',
                        }
                      : { borderColor: 'var(--admin-border)', color: 'var(--admin-text-muted)' }
                  }
                >
                  <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--admin-text-disabled)' }}>
              {currentTheme === 'system'
                ? `Following system preference (currently ${resolvedTheme})`
                : `${currentTheme === 'dark' ? 'Dark' : 'Light'} mode active`}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3 — API & Integrations Status
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="hub"
          iconColor="text-[var(--admin-accent)]"
          title="API & Integrations"
          description="Status of all connected services and APIs"
        />

        <div className="p-6 space-y-3">
          {/* Shopify Storefront API */}
          <div className="flex items-center justify-between py-3 px-4 bg-[var(--admin-bg-elevated)] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--admin-success)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-[var(--admin-success)]">
                  storefront
                </span>
              </div>
              <div>
                <p className="text-sm text-[var(--admin-text-heading)] font-medium">
                  Shopify Storefront API
                </p>
                <p className="text-xs text-[var(--admin-text-muted)]">
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
                <span className="text-[10px] text-[var(--admin-text-disabled)] font-mono">
                  2026-04
                </span>
              )}
            </div>
          </div>

          {/* Shopify Admin API */}
          <div className="flex items-center justify-between py-3 px-4 bg-[var(--admin-bg-elevated)] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--admin-success)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-[var(--admin-success)]">
                  admin_panel_settings
                </span>
              </div>
              <div>
                <p className="text-sm text-[var(--admin-text-heading)] font-medium">
                  Shopify Admin API
                </p>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Product management, orders, inventory
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusDot
                ok={config.shopify.connected}
                label={config.shopify.connected ? 'Connected' : 'Not configured'}
              />
              {config.shopify.connected && (
                <span className="text-[10px] text-[var(--admin-text-disabled)] font-mono">
                  2026-04
                </span>
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
                className="flex items-center justify-between py-3 px-4 bg-[var(--admin-bg-elevated)] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                    }}
                  >
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ color: meta.color }}
                    >
                      {meta.icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--admin-text-heading)] font-medium flex items-center gap-2">
                      {meta.name}
                      {isActive && (
                        <span className="text-[10px] bg-[var(--admin-brand)]/10 text-[var(--admin-brand)] px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--admin-text-muted)]">
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
          <div className="flex items-center justify-between py-3 px-4 bg-[var(--admin-bg-elevated)] rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--admin-border-hover)]/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-[var(--admin-text-muted)]">
                  inventory_2
                </span>
              </div>
              <div>
                <p className="text-sm text-[var(--admin-text-heading)] font-medium">
                  AutoDS Integration
                </p>
                <p className="text-xs text-[var(--admin-text-muted)]">
                  Dropshipping & product sourcing
                </p>
              </div>
            </div>
            <StatusDot ok={false} label="Not connected" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4 — AI Provider Configuration
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="smart_toy"
          iconColor="text-[var(--admin-brand)]"
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
                <div
                  key={p}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleProviderChange(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleProviderChange(p);
                  }}
                  className={`relative text-left rounded-xl p-4 border-2 transition-all overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'border-[var(--admin-brand)] bg-[var(--admin-brand)]/5'
                      : 'border-[var(--admin-border)] hover:border-[var(--admin-border-hover)] bg-[var(--admin-bg-elevated)]'
                  }`}
                  style={isSelected ? { boxShadow: `inset 4px 0 0 ${meta.color}` } : undefined}
                >
                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    {isReady ? (
                      <span
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                          keySource === 'runtime'
                            ? 'text-[var(--admin-brand)] bg-[var(--admin-brand)]/10'
                            : 'text-[var(--admin-success)] bg-[var(--admin-success)]/10'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            keySource === 'runtime'
                              ? 'bg-[var(--admin-brand)]'
                              : 'bg-[var(--admin-success)]'
                          }`}
                        />
                        Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--admin-text-muted)] bg-[var(--admin-text-muted)]/10 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-text-muted)]" />
                        No key
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ color: meta.color }}
                      >
                        {meta.icon}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-[var(--admin-text-heading)] font-medium text-sm">
                        {meta.name}
                      </div>
                      {/* Toggle acts as radio — clicking enables this provider */}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProviderChange(p);
                        }}
                      >
                        <Toggle
                          enabled={isSelected}
                          onChange={() => handleProviderChange(p)}
                          size="sm"
                        />
                      </span>
                    </div>
                  </div>

                  <p className="text-[var(--admin-text-muted)] text-xs leading-relaxed">
                    {meta.description}
                  </p>

                  {!isReady && meta.envKey && (
                    <p className="text-[var(--admin-text-disabled)] text-[10px] mt-2 font-mono">
                      Add key below or set {meta.envKey}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── API Keys ───────────────────────────────────────────────────────── */}
          <div className="px-0 py-2 border-t border-[var(--admin-border)]">
            <h3
              className="text-sm font-semibold flex items-center gap-2 mb-4"
              style={{ color: 'var(--admin-text)' }}
            >
              <span className="material-symbols-outlined text-[var(--admin-brand)] text-lg">
                key
              </span>
              API Keys
            </h3>

            <div className="space-y-3">
              {[
                {
                  key: 'claude' as const,
                  label: 'Claude',
                  icon: 'psychology',
                  color: '#d4a843',
                  env: 'ANTHROPIC_API_KEY',
                  placeholder: 'sk-ant-...',
                },
                {
                  key: 'openai' as const,
                  label: 'OpenAI',
                  icon: 'auto_awesome',
                  color: 'var(--admin-success)',
                  env: 'OPENAI_API_KEY',
                  placeholder: 'sk-...',
                },
                {
                  key: 'gemini' as const,
                  label: 'Gemini',
                  icon: 'diamond',
                  color: '#6366f1',
                  env: 'GOOGLE_GENERATIVE_AI_API_KEY',
                  placeholder: 'AIza...',
                },
                {
                  key: 'tavily' as const,
                  label: 'Tavily',
                  icon: 'travel_explore',
                  color: 'var(--admin-warning)',
                  env: 'TAVILY_API_KEY',
                  placeholder: 'tvly-...',
                },
              ].map((p) => {
                const status = config?.apiKeyStatus?.[p.key];
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    {/* Icon */}
                    <span
                      className="material-symbols-outlined text-lg flex-none"
                      style={{ color: p.color }}
                    >
                      {p.icon}
                    </span>

                    {/* Name + status */}
                    <div className="w-20 flex-none">
                      <span className="text-[var(--admin-text-heading)] text-xs font-medium">
                        {p.label}
                      </span>
                      <div className="mt-0.5">
                        {status?.configured ? (
                          <span className="text-[10px] text-[var(--admin-success)]">
                            ✓ {status.source === 'runtime' ? 'UI' : 'env'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--admin-text-disabled)]">
                            not set
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Current masked key (if exists) */}
                    {status?.configured && status.masked && (
                      <span className="text-[10px] text-[var(--admin-text-disabled)] font-mono flex-none w-28 truncate">
                        {status.masked}
                      </span>
                    )}

                    {/* Input */}
                    <div className="flex-1 relative">
                      <input
                        type={showKeys[p.key] ? 'text' : 'password'}
                        value={apiKeyInputs[p.key] ?? ''}
                        onChange={(e) =>
                          setApiKeyInputs((prev) => ({ ...prev, [p.key]: e.target.value }))
                        }
                        placeholder={
                          status?.configured ? 'Enter new key to replace...' : p.placeholder
                        }
                        className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2 text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-text-disabled)] focus:outline-none focus:border-[var(--admin-brand)]/50 font-mono pr-8"
                      />
                      <button
                        onClick={() => setShowKeys((prev) => ({ ...prev, [p.key]: !prev[p.key] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--admin-text-disabled)] hover:text-[var(--admin-text-muted)]"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {showKeys[p.key] ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Single save button */}
            <button
              onClick={handleSaveKeys}
              disabled={savingKeys || !Object.values(apiKeyInputs).some((v) => v?.trim())}
              className="mt-4 flex items-center gap-2 bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] disabled:bg-[var(--admin-brand)]/30 text-[var(--admin-bg)] font-semibold text-xs rounded-lg px-4 py-2 transition-all"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save All Keys
            </button>

            {/* Tip */}
            <p className="text-[var(--admin-text-disabled)] text-[10px] mt-2">
              Keys are stored securely on the server. You only need ONE AI key to start (Claude
              recommended). Tavily is optional — enables pro market research.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <h3 className="text-xs font-medium text-[var(--admin-text-secondary)] mb-3 flex items-center gap-2">
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
                <div className="bg-[var(--admin-bg-elevated)] rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-sm text-[var(--admin-warning)]">
                      computer
                    </span>
                    <span className="text-xs text-[var(--admin-text-secondary)] font-medium">
                      Ollama — Free &amp; Private
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--admin-text-muted)] italic mb-1">
                    Run AI on your own computer. Completely free, no data leaves your machine.
                  </p>
                  <SetupGuide
                    open={guideOpen['ollama'] ?? false}
                    onToggle={() => setGuideOpen((prev) => ({ ...prev, ollama: !prev['ollama'] }))}
                    steps={[
                      'Install Ollama from <a href="https://ollama.com" target="_blank" rel="noopener" class="text-[var(--admin-brand)] hover:underline">ollama.com</a>',
                      'Run <code class="bg-[var(--admin-border)] px-1 rounded text-[var(--admin-text-secondary)] font-mono">ollama pull llama3.1:8b</code> in your terminal',
                      'Make sure Ollama is running — the app icon should appear in your menu bar',
                      'Set the URL below (default: <code class="bg-[var(--admin-border)] px-1 rounded text-[var(--admin-text-secondary)] font-mono">http://localhost:11434</code>)',
                    ]}
                    pricing="Free — uses your computer's GPU/CPU."
                    freeNote="8GB RAM minimum, 16GB recommended for best performance."
                    links={[{ text: 'ollama.com', href: 'https://ollama.com' }]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1.5">
                    Ollama Server URL
                  </label>
                  <div className="flex gap-3">
                    <input
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                      className="flex-1 bg-[var(--admin-bg-input)] border border-[var(--admin-border)] focus:border-[var(--admin-brand)] focus:ring-1 focus:ring-[var(--admin-brand)] text-[var(--admin-text)] rounded-xl px-4 py-2.5 text-sm outline-none"
                    />
                    <button
                      onClick={() => testConnection('ollama')}
                      disabled={testing === 'ollama'}
                      className="bg-[var(--admin-warning)]/10 hover:bg-[var(--admin-warning)]/20 text-[var(--admin-warning)] border border-[var(--admin-warning)]/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-2"
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
                      className={`mt-2 text-xs flex items-center gap-1 ${ollamaTest.ok ? 'text-[var(--admin-success)]' : 'text-[var(--admin-error)]'}`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {ollamaTest.ok ? 'check_circle' : 'error'}
                      </span>
                      {ollamaTest.msg}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--admin-text-secondary)] mb-1.5">
                    Model
                  </label>
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
                            ? 'border-[var(--admin-warning)] bg-[var(--admin-warning)]/10 text-[var(--admin-warning)]'
                            : 'border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-hover)]'
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
                    className="w-full mt-2 bg-[var(--admin-bg-input)] border border-[var(--admin-border)] focus:border-[var(--admin-brand)] text-[var(--admin-text)] rounded-lg px-3 py-2 text-xs font-mono outline-none"
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
                      className="text-left rounded-lg px-3 py-2 text-sm border transition-colors border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-hover)]"
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
                  <div className="mt-3 bg-[var(--admin-error)]/5 border border-[var(--admin-error)]/20 rounded-xl p-3 text-xs text-[var(--admin-error)] flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm mt-0.5">warning</span>
                    <div>
                      <strong>API key missing.</strong> Enter the key in the{' '}
                      <strong>API Keys</strong> section above, or set{' '}
                      <code className="bg-[var(--admin-error)]/10 px-1 rounded">
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
          <div className="bg-[var(--admin-bg-elevated)] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[var(--admin-text-secondary)]">
                  Shopify Connection Test
                </p>
                <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                  Verify your Shopify Admin API credentials are working
                </p>
              </div>
              <button
                onClick={() => testConnection('shopify')}
                disabled={testing === 'shopify' || !config.shopify.connected}
                className="bg-[var(--admin-success)]/10 hover:bg-[var(--admin-success)]/20 text-[var(--admin-success)] border border-[var(--admin-success)]/20 rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
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
                className={`text-xs flex items-center gap-1 ${shopifyTest.ok ? 'text-[var(--admin-success)]' : 'text-[var(--admin-error)]'}`}
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
              className="bg-[var(--admin-brand)] hover:bg-[var(--admin-brand-hover)] disabled:bg-[var(--admin-border)] text-[var(--admin-bg)] font-semibold rounded-xl px-8 py-3 text-sm transition-colors flex items-center gap-2"
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
      <div className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="query_stats"
          iconColor="text-[var(--admin-warning)]"
          title="🔍 Market Research — The Eyes"
          description="How the Market Intelligence Agent searches the internet for winning products"
        />

        <div className="p-6">
          {/* Explanation box */}
          <div className="bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-base">🧠</span>
              <span className="text-[var(--admin-text-heading)] text-sm font-semibold">
                AI Model (Brain)
              </span>
              <span className="text-[var(--admin-brand)] text-sm">+</span>
              <span className="text-base">🔍</span>
              <span className="text-[var(--admin-text-heading)] text-sm font-semibold">
                Search Tool (Eyes)
              </span>
              <span className="text-[var(--admin-brand)] text-sm">=</span>
              <span className="text-base">🏆</span>
              <span className="text-[var(--admin-text-heading)] text-sm font-semibold">
                Winning Products
              </span>
            </div>
            <p className="text-[var(--admin-text-muted)] text-xs leading-relaxed">
              The AI model analyzes and scores products. The search tool brings fresh data from the
              internet. Together they find the best products to sell in your store.
            </p>
          </div>

          {/* Two cards side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Search Card */}
            <div
              className={`border rounded-2xl p-5 transition-all ${
                searchModes.free
                  ? 'bg-[var(--admin-bg-card)] border-[var(--admin-success)]/50 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                  : 'bg-[var(--admin-bg-elevated)]/50 border-[var(--admin-border)]/50 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--admin-success)]">
                    psychology
                  </span>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    🧠 AI Analysis
                  </h3>
                </div>
                <Toggle
                  enabled={searchModes.free}
                  onChange={(v) => {
                    if (!v && !searchModes.tavily) {
                      toast.error('At least one search mode must be enabled');
                      return;
                    }
                    handleSaveSearchModes({ ...searchModes, free: v });
                  }}
                />
              </div>
              {/* Key status banner */}
              {config?.providers?.gemini?.configured ||
              config?.providers?.claude?.configured ||
              config?.providers?.openai?.configured ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--admin-success)]/10 border border-[var(--admin-success)]/20 mb-3">
                  <span className="material-symbols-outlined text-[var(--admin-success)] text-base">
                    check_circle
                  </span>
                  <span className="text-[var(--admin-success)] text-xs font-semibold">
                    Ready — using your{' '}
                    {config?.providers?.gemini?.configured
                      ? 'Gemini'
                      : config?.providers?.claude?.configured
                        ? 'Claude'
                        : 'OpenAI'}{' '}
                    key
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--admin-brand)]/10 border border-[var(--admin-brand)]/20 mb-3">
                  <span className="material-symbols-outlined text-[var(--admin-brand)] text-base">
                    info
                  </span>
                  <span className="text-[var(--admin-brand)] text-xs font-semibold">
                    Add an AI key above to enable
                  </span>
                </div>
              )}
              <p className="text-[var(--admin-text-muted)] text-xs leading-relaxed mb-3">
                The AI model analyzes products from its training knowledge. Works with any
                configured AI key (Gemini, Claude, or OpenAI). No extra cost.
              </p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2 text-[var(--admin-success)]">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Works with any AI key you already have
                </li>
                <li className="flex items-center gap-2 text-[var(--admin-success)]">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  No extra API or cost needed
                </li>
                <li className="flex items-center gap-2 text-[var(--admin-success)]">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Deep analysis of trends, pricing, competition
                </li>
                <li className="flex items-center gap-2 text-[var(--admin-text-secondary)]">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Based on AI training data (not real-time web)
                </li>
              </ul>
            </div>

            {/* Tavily Pro Card */}
            <div
              className={`border rounded-2xl p-5 transition-all ${
                searchModes.tavily
                  ? 'bg-[var(--admin-bg-card)] border-[var(--admin-accent)]/50 shadow-[0_0_20px_rgba(99,102,241,0.08)]'
                  : 'bg-[var(--admin-bg-elevated)]/50 border-[var(--admin-border)]/50 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--admin-accent)]">
                    travel_explore
                  </span>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    🔍 Web Search (Tavily)
                  </h3>
                </div>
                <Toggle
                  enabled={searchModes.tavily}
                  onChange={(v) => {
                    if (!v && !searchModes.free) {
                      toast.error('At least one search mode must be enabled');
                      return;
                    }
                    const tavilyStatus = config?.apiKeyStatus?.tavily;
                    if (v && !tavilyStatus?.configured) {
                      toast.error('Add your Tavily API key first');
                      return;
                    }
                    handleSaveSearchModes({ ...searchModes, tavily: v });
                  }}
                />
              </div>
              {/* Key status banner */}
              {config?.apiKeyStatus?.tavily?.configured ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--admin-success)]/10 border border-[var(--admin-success)]/20 mb-3">
                  <span className="material-symbols-outlined text-[var(--admin-success)] text-base">
                    check_circle
                  </span>
                  <span className="text-[var(--admin-success)] text-xs font-semibold">
                    API Key configured
                  </span>
                  <span className="text-[var(--admin-success)]/60 text-[10px] font-mono ml-auto">
                    {config.apiKeyStatus.tavily.masked}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--admin-error)]/10 border border-[var(--admin-error)]/20 mb-3">
                  <span className="material-symbols-outlined text-[var(--admin-error)] text-base">
                    warning
                  </span>
                  <span className="text-[var(--admin-error)] text-xs font-semibold">
                    API Key needed
                  </span>
                  <span className="text-[var(--admin-error)]/60 text-[10px] ml-auto">
                    Add key below to activate
                  </span>
                </div>
              )}

              <p className="text-[var(--admin-text-muted)] text-xs leading-relaxed mb-3">
                Real-time web search — queries Google, Amazon, TikTok, Reddit, and more for current
                data.
              </p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2 text-[var(--admin-success)]">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Free tier: 1,000 searches/mo · 100 req/min
                </li>
                <li className="flex items-center gap-2 text-[var(--admin-success)]">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Deep structured results with AI summaries
                </li>
                <li className="flex items-center gap-2 text-[var(--admin-success)]">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Best accuracy for product research
                </li>
                <li className="flex items-center gap-2 text-[var(--admin-text-secondary)]">
                  <span className="material-symbols-outlined text-sm">info</span>
                  ~$0.01/search after free tier · ~$0.12/session
                </li>
              </ul>

              {/* Tavily API key section */}
              <div className="mt-4 pt-4 border-t border-[var(--admin-border)]">
                <SetupGuide
                  open={tavilyGuideOpen}
                  onToggle={() => setTavilyGuideOpen((v) => !v)}
                  steps={[
                    'Go to <a href="https://tavily.com" target="_blank" rel="noopener" class="text-[var(--admin-brand)] hover:underline">tavily.com</a> and click <strong>"Get API Key"</strong>',
                    'Create a free account — <strong>1,000 searches/month + 100 req/min</strong> included',
                    'Copy your API key from the dashboard (starts with <code>tvly-</code>)',
                    'Paste it in the field below and click Save',
                  ]}
                  pricing="Free: 1,000 searches/mo · 100 req/min. Paid: ~$0.01/search."
                  pricingNote="Free tier is enough for ~83 full research sessions per month!"
                />
                <div className="flex gap-2 mt-3">
                  <div className="relative flex-1">
                    <input
                      type={showTavilyKey ? 'text' : 'password'}
                      value={tavilyKey}
                      onChange={(e) => setTavilyKey(e.target.value)}
                      placeholder="tvly-..."
                      className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] focus:border-[var(--admin-accent)] focus:ring-1 focus:ring-[var(--admin-accent)] text-[var(--admin-text)] rounded-xl px-4 py-2.5 text-sm font-mono outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTavilyKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-secondary)] transition-colors"
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
                    className="bg-[var(--admin-accent)]/10 hover:bg-[var(--admin-accent)]/20 text-[var(--admin-accent)] border border-[var(--admin-accent)]/20 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
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
                    className="bg-[var(--admin-border)] hover:bg-[var(--admin-border)] disabled:opacity-40 text-[var(--admin-brand)] border border-[var(--admin-brand)]/30 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5"
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
                    className={`mt-2 text-xs flex items-center gap-1 ${tavilyTest.ok ? 'text-[var(--admin-success)]' : 'text-[var(--admin-error)]'}`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {tavilyTest.ok ? 'check_circle' : 'error'}
                    </span>
                    {tavilyTest.msg}
                  </div>
                )}
                <p className="text-[10px] text-[var(--admin-text-disabled)] font-mono mt-2">
                  Env: TAVILY_API_KEY
                </p>
              </div>
            </div>
          </div>

          {/* Active modes summary */}
          <div className="mt-4 flex items-center gap-2 text-[var(--admin-text-muted)] text-xs">
            <span className="material-symbols-outlined text-sm">info</span>
            Active:{' '}
            {[searchModes.free && '🧠 AI Analysis', searchModes.tavily && '🔍 Web Search']
              .filter(Boolean)
              .join(' + ') || 'None'}
            {searchModes.free &&
              searchModes.tavily &&
              ' — you can choose per-session in Market Research'}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 7 — Environment Variables Reference
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="key"
          iconColor="text-[var(--admin-text-muted)]"
          title="Environment Variables"
          description="API keys stored in .env.local — never in the database"
        />

        <div className="p-6">
          <div className="bg-[var(--admin-bg-elevated)] rounded-xl overflow-hidden font-mono text-xs">
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
                className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--admin-border)] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${env.configured ? 'bg-[var(--admin-success)]' : 'bg-[var(--admin-border-hover)]'}`}
                  />
                  <span className="text-[var(--admin-text-secondary)]">{env.key}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--admin-text-disabled)]">{env.label}</span>
                  <span
                    className={`text-[10px] ${env.configured ? 'text-[var(--admin-success)]' : 'text-[var(--admin-text-disabled)]'}`}
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
          SECTION 9 — Trend Data Providers
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--admin-bg-card)] border border-[var(--admin-border)] rounded-2xl overflow-hidden">
        <SectionHeader
          icon="trending_up"
          iconColor="text-[var(--admin-accent)]"
          title="Trend Data Providers"
          description="Multi-source trend aggregation for product research intelligence"
        />

        <div className="p-6 space-y-6">
          {trendProviders.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-[var(--admin-text-muted)] text-sm gap-2">
              <span className="material-symbols-outlined text-[var(--admin-text-disabled)] animate-spin">
                progress_activity
              </span>
              Loading provider configuration…
            </div>
          ) : (
            <>
              {/* Provider Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trendProviders.map((provider) => {
                  const meta = TREND_PROVIDER_META[provider.id];
                  const testResult = trendTestResults[provider.id] ?? null;
                  const isTesting = trendTesting === provider.id;
                  const statusColor =
                    provider.enabled && provider.hasKey
                      ? 'var(--admin-success)'
                      : provider.enabled
                        ? 'var(--admin-warning)'
                        : 'var(--admin-text-disabled)';

                  return (
                    <div
                      key={provider.id}
                      className="bg-[var(--admin-bg-elevated)] border border-[var(--admin-border)] rounded-2xl p-4 space-y-3"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-sm"
                              style={{ color: meta.color }}
                            >
                              {meta.icon}
                            </span>
                          </div>
                          <div>
                            <p className="text-[var(--admin-text-heading)] text-sm font-medium flex items-center gap-1.5">
                              {meta.name}
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-normal"
                                style={{
                                  backgroundColor: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                                  color: meta.color,
                                }}
                              >
                                {provider.reliability}
                              </span>
                            </p>
                            <p className="text-[10px] text-[var(--admin-text-disabled)]">
                              {meta.cost}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: statusColor }}
                          />
                          <Toggle
                            enabled={provider.enabled}
                            onChange={(v) => handleToggleTrendProvider(provider.id, v)}
                            size="sm"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[var(--admin-text-muted)] text-xs">{meta.description}</p>

                      {/* API Key Fields */}
                      {meta.requiresKey &&
                        meta.keyFields.map((field) => {
                          const keyStatus = trendKeyStatuses?.[field.id];
                          const inputVal = trendKeyInputs[field.id] ?? '';
                          const showVal = trendShowKeys[field.id] ?? false;
                          return (
                            <div key={field.id} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] text-[var(--admin-text-secondary)]">
                                  {field.label}
                                </label>
                                {keyStatus?.configured && (
                                  <span className="text-[10px] text-[var(--admin-success)] font-mono">
                                    {keyStatus.masked}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-1.5">
                                <div className="relative flex-1">
                                  <input
                                    type={showVal ? 'text' : 'password'}
                                    value={inputVal}
                                    onChange={(e) =>
                                      setTrendKeyInputs((prev) => ({
                                        ...prev,
                                        [field.id]: e.target.value,
                                      }))
                                    }
                                    placeholder={
                                      keyStatus?.configured
                                        ? 'Enter new key to replace...'
                                        : field.placeholder
                                    }
                                    className="w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-text-disabled)] focus:outline-none focus:border-[var(--admin-accent)]/50 font-mono pr-7"
                                  />
                                  <button
                                    onClick={() =>
                                      setTrendShowKeys((prev) => ({
                                        ...prev,
                                        [field.id]: !prev[field.id],
                                      }))
                                    }
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--admin-text-disabled)] hover:text-[var(--admin-text-muted)]"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      {showVal ? 'visibility_off' : 'visibility'}
                                    </span>
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleSaveTrendKey(field.id)}
                                  disabled={!inputVal.trim() || savingTrendKey === field.id}
                                  className="bg-[var(--admin-accent)]/10 hover:bg-[var(--admin-accent)]/20 text-[var(--admin-accent)] border border-[var(--admin-accent)]/20 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 flex items-center"
                                >
                                  {savingTrendKey === field.id ? (
                                    <span className="material-symbols-outlined text-sm animate-spin">
                                      progress_activity
                                    </span>
                                  ) : (
                                    <span className="material-symbols-outlined text-sm">save</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {/* Test Connection */}
                      <div className="flex items-center gap-2 pt-1 border-t border-[var(--admin-border)]">
                        <button
                          onClick={() => handleTestTrendProvider(provider.id)}
                          disabled={isTesting}
                          className="flex items-center gap-1.5 text-xs text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] border border-[var(--admin-border)] hover:border-[var(--admin-border-hover)] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {isTesting ? (
                            <span className="material-symbols-outlined text-sm animate-spin">
                              progress_activity
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">bolt</span>
                          )}
                          Test
                        </button>
                        {testResult && (
                          <span
                            className={`flex items-center gap-1 text-xs ${testResult.ok ? 'text-[var(--admin-success)]' : 'text-[var(--admin-error)]'}`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {testResult.ok ? 'check_circle' : 'error'}
                            </span>
                            {testResult.ok
                              ? `${testResult.latency}ms`
                              : (testResult.error ?? 'Failed')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strategy Selector */}
              <div className="border-t border-[var(--admin-border)] pt-5">
                <h3 className="text-sm font-semibold text-[var(--admin-text-heading)] mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--admin-accent)]">
                    merge
                  </span>
                  Aggregation Strategy
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      {
                        value: 'smart-merge' as const,
                        label: 'Smart Merge',
                        desc: 'Weighted average across all providers',
                      },
                      {
                        value: 'primary-only' as const,
                        label: 'Primary Only',
                        desc: 'Highest reliability provider only',
                      },
                      {
                        value: 'fallback-chain' as const,
                        label: 'Fallback Chain',
                        desc: 'Try in order, return first success',
                      },
                    ] as {
                      value: TrendConfigState['activeStrategy'];
                      label: string;
                      desc: string;
                    }[]
                  ).map((s) => (
                    <button
                      key={s.value}
                      onClick={() =>
                        setTrendConfig((prev) =>
                          prev ? { ...prev, activeStrategy: s.value } : prev,
                        )
                      }
                      className={`text-left rounded-xl p-3 border transition-all ${
                        trendConfig?.activeStrategy === s.value
                          ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]'
                          : 'border-[var(--admin-border)] text-[var(--admin-text-secondary)] hover:border-[var(--admin-border-hover)]'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1">{s.label}</p>
                      <p className="text-[10px] text-[var(--admin-text-muted)] leading-relaxed">
                        {s.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cache Toggle */}
              <div className="flex items-center justify-between py-3 px-4 bg-[var(--admin-bg-elevated)] rounded-xl">
                <div>
                  <p className="text-sm text-[var(--admin-text-heading)] font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[var(--admin-accent)]">
                      speed
                    </span>
                    Result Cache
                  </p>
                  <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                    Cache provider responses · Default TTL 6h · Reduces API calls and latency
                  </p>
                </div>
                <Toggle
                  enabled={trendConfig?.cacheEnabled ?? true}
                  onChange={(v) =>
                    setTrendConfig((prev) => (prev ? { ...prev, cacheEnabled: v } : prev))
                  }
                  size="sm"
                />
              </div>

              {/* Save */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveTrendConfig}
                  disabled={savingTrendConfig || !trendConfig}
                  // eslint-disable-next-line no-restricted-syntax -- over solid --admin-accent button
                  className="bg-[var(--admin-accent)] hover:bg-[var(--admin-accent-hover)] disabled:bg-[var(--admin-border)] text-white font-semibold rounded-xl px-8 py-3 text-sm transition-colors flex items-center gap-2"
                >
                  {savingTrendConfig ? (
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-base">save</span>
                  )}
                  Save Trend Settings
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 8 — Danger Zone
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--admin-bg-card)] border border-[var(--admin-error)]/30 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--admin-error)]/20 bg-[var(--admin-error)]/5">
          <h2 className="text-[var(--admin-error)] font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--admin-error)]">dangerous</span>
            Danger Zone
          </h2>
          <p className="text-[var(--admin-error)]/60 text-xs mt-1">
            These actions are irreversible — proceed with caution
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Clear Cache */}
          <div className="flex items-center justify-between p-4 border border-[var(--admin-error)]/20 rounded-xl bg-[var(--admin-error)]/5">
            <div>
              <p className="text-sm text-[var(--admin-text-heading)] font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[var(--admin-error)]">
                  delete_sweep
                </span>
                Clear All Cache
              </p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                Invalidates all Shopify data cache. Next requests will refetch from the API.
              </p>
            </div>
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="shrink-0 ml-4 bg-[var(--admin-error)]/10 hover:bg-[var(--admin-error)]/20 text-[var(--admin-error)] border border-[var(--admin-error)]/30 rounded-xl px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
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
          <div className="flex items-center justify-between p-4 border border-[var(--admin-error)]/20 rounded-xl bg-[var(--admin-error)]/5">
            <div>
              <p className="text-sm text-[var(--admin-text-heading)] font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[var(--admin-error)]">
                  logout
                </span>
                Logout from All Sessions
              </p>
              <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                Clears your admin session cookie. You will be redirected to the login page. Other
                active sessions using the same browser will also be invalidated.
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="shrink-0 ml-4 bg-[var(--admin-error)]/10 hover:bg-[var(--admin-error)]/20 text-[var(--admin-error)] border border-[var(--admin-error)]/30 rounded-xl px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
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
