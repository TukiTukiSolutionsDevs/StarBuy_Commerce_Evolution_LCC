'use client';

import { useEffect, useState } from 'react';

type Provider = 'claude' | 'openai' | 'gemini' | 'ollama';

type ProviderInfo = {
  configured: boolean;
  models: string[];
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
};

const PROVIDER_META: Record<Provider, { name: string; icon: string; color: string; envKey: string; description: string }> = {
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

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Selected values (local state before save)
  const [selectedProvider, setSelectedProvider] = useState<Provider>('claude');
  const [selectedModel, setSelectedModel] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.1:8b');

  // Connection test results
  const [shopifyTest, setShopifyTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [ollamaTest, setOllamaTest] = useState<{ ok: boolean; msg: string; models?: string[] } | null>(null);
  const [testing, setTesting] = useState('');

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
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
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
      showToast('Settings saved successfully', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(type: 'shopify' | 'ollama') {
    setTesting(type);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: type }),
      });
      const data = await res.json();
      if (type === 'shopify') {
        setShopifyTest({ ok: data.success, msg: data.message ?? data.error });
      } else {
        setOllamaTest({ ok: data.success, msg: data.message ?? data.error, models: data.models });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      if (type === 'shopify') setShopifyTest({ ok: false, msg });
      else setOllamaTest({ ok: false, msg });
    } finally {
      setTesting('');
    }
  }

  // When provider changes, auto-select first model
  function handleProviderChange(p: Provider) {
    setSelectedProvider(p);
    if (p === 'ollama') {
      setSelectedModel(ollamaModel);
    } else {
      const models = config?.providers[p]?.models ?? [];
      setSelectedModel(models[0] ?? '');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-[#d4a843] text-3xl animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!config) return null;

  const activeProviderMeta = PROVIDER_META[selectedProvider];
  const isProviderReady = selectedProvider === 'ollama' || config.providers[selectedProvider]?.configured;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>
          Settings
        </h1>
        <p className="text-[#6b7280] text-sm mt-1">
          Configure your AI assistant and Shopify connection
        </p>
      </div>

      {/* ─── AI Provider Selection ─────────────────────────────────────────── */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f2d4e]">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[#d4a843]">smart_toy</span>
            AI Provider
          </h2>
          <p className="text-[#6b7280] text-xs mt-1">
            Choose which AI powers your admin assistant
          </p>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          {(Object.keys(PROVIDER_META) as Provider[]).map((p) => {
            const meta = PROVIDER_META[p];
            const info = config.providers[p];
            const isSelected = selectedProvider === p;
            const isReady = p === 'ollama' || info.configured;

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
                {/* Status dot */}
                <div className="absolute top-3 right-3">
                  {isReady ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
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
                    <span className="material-symbols-outlined text-xl" style={{ color: meta.color }}>
                      {meta.icon}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">{meta.name}</div>
                  </div>
                </div>

                <p className="text-[#6b7280] text-xs leading-relaxed">{meta.description}</p>

                {!isReady && p !== 'ollama' && (
                  <p className="text-[#374151] text-[10px] mt-2 font-mono">
                    Add {meta.envKey} to .env.local
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Model Selection ───────────────────────────────────────────────── */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f2d4e]">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ color: activeProviderMeta.color }}>
              {activeProviderMeta.icon}
            </span>
            {activeProviderMeta.name} — Model
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {selectedProvider === 'ollama' ? (
            <>
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
                      <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-base">bolt</span>
                    )}
                    Test
                  </button>
                </div>
                {ollamaTest && (
                  <div className={`mt-2 text-xs flex items-center gap-1 ${ollamaTest.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
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
                  {(ollamaTest?.models ?? PROVIDER_META.ollama.description ? config.providers.ollama.models : []).map((m) => (
                    <button
                      key={m}
                      onClick={() => { setOllamaModel(m); setSelectedModel(m); }}
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
                <div className="mt-2">
                  <input
                    value={ollamaModel}
                    onChange={(e) => { setOllamaModel(e.target.value); setSelectedModel(e.target.value); }}
                    placeholder="Or type custom model name..."
                    className="w-full bg-[#0f1729] border border-[#1f2d4e] focus:border-[#d4a843] text-white rounded-lg px-3 py-2 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">Model</label>
              <div className="grid grid-cols-2 gap-2">
                {config.providers[selectedProvider].models.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={`text-left rounded-lg px-3 py-2 text-sm border transition-colors ${
                      selectedModel === m
                        ? `border-[${activeProviderMeta.color}] bg-[${activeProviderMeta.color}]/10 text-white`
                        : 'border-[#1f2d4e] text-[#9ca3af] hover:border-[#374151]'
                    }`}
                    style={selectedModel === m ? { borderColor: activeProviderMeta.color, backgroundColor: `${activeProviderMeta.color}15` } : {}}
                  >
                    <span className="font-mono text-xs">{m}</span>
                  </button>
                ))}
              </div>

              {!isProviderReady && (
                <div className="mt-3 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-xl p-3 text-xs text-[#ef4444] flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm mt-0.5">warning</span>
                  <div>
                    <strong>API key missing.</strong> Add <code className="bg-[#ef4444]/10 px-1 rounded">{activeProviderMeta.envKey}</code> to your <code>.env.local</code> file and restart the server.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── Shopify Connection ────────────────────────────────────────────── */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f2d4e]">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[#10b981]">storefront</span>
            Shopify Connection
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Store Domain</label>
              <div className="bg-[#0f1729] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm text-white font-mono">
                {config.shopify.domain || '—'}
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Client ID</label>
              <div className="bg-[#0f1729] border border-[#1f2d4e] rounded-xl px-4 py-2.5 text-sm text-[#9ca3af] font-mono truncate">
                {config.shopify.clientId ? `${config.shopify.clientId.slice(0, 12)}...` : '—'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${config.shopify.connected ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
              <span className={`text-sm ${config.shopify.connected ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {config.shopify.connected ? 'Credentials configured' : 'Missing credentials'}
              </span>
            </div>

            <button
              onClick={() => testConnection('shopify')}
              disabled={testing === 'shopify' || !config.shopify.connected}
              className="bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/20 rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testing === 'shopify' ? (
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-base">bolt</span>
              )}
              Test Connection
            </button>
          </div>

          {shopifyTest && (
            <div className={`text-xs flex items-center gap-1 ${shopifyTest.ok ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              <span className="material-symbols-outlined text-sm">
                {shopifyTest.ok ? 'check_circle' : 'error'}
              </span>
              {shopifyTest.msg}
            </div>
          )}

          <div className="bg-[#0d1526] rounded-xl p-4 text-xs text-[#6b7280] space-y-1">
            <p className="font-medium text-[#9ca3af]">Auth: OAuth Client Credentials</p>
            <p>Token auto-refreshes every 24 hours. No manual token management needed.</p>
            <p className="font-mono text-[10px] text-[#374151]">
              Env vars: SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
            </p>
          </div>
        </div>
      </section>

      {/* ─── Environment Variables Reference ────────────────────────────────── */}
      <section className="bg-[#111827] border border-[#1f2d4e] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1f2d4e]">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[#6b7280]">key</span>
            Environment Variables
          </h2>
          <p className="text-[#6b7280] text-xs mt-1">
            API keys are stored securely in .env.local — not in the database
          </p>
        </div>

        <div className="p-6">
          <div className="bg-[#0d1526] rounded-xl overflow-hidden font-mono text-xs">
            {[
              { key: 'ANTHROPIC_API_KEY', label: 'Claude', configured: config.providers.claude.configured },
              { key: 'OPENAI_API_KEY', label: 'OpenAI', configured: config.providers.openai.configured },
              { key: 'GOOGLE_GENERATIVE_AI_API_KEY', label: 'Gemini', configured: config.providers.gemini.configured },
              { key: 'SHOPIFY_STORE_DOMAIN', label: 'Shopify', configured: !!config.shopify.domain },
              { key: 'SHOPIFY_CLIENT_ID', label: 'Shopify', configured: !!config.shopify.clientId },
              { key: 'SHOPIFY_CLIENT_SECRET', label: 'Shopify', configured: config.shopify.hasClientSecret },
              { key: 'ADMIN_CHAT_PASSWORD', label: 'Admin', configured: true },
            ].map((env) => (
              <div
                key={env.key}
                className="flex items-center justify-between px-4 py-2.5 border-b border-[#1f2d4e] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${env.configured ? 'bg-[#10b981]' : 'bg-[#374151]'}`} />
                  <span className="text-[#9ca3af]">{env.key}</span>
                </div>
                <span className={`text-[10px] ${env.configured ? 'text-[#10b981]' : 'text-[#374151]'}`}>
                  {env.configured ? 'Set' : 'Missing'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Save Button ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-4 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#d4a843] hover:bg-[#e4c06a] disabled:bg-[#1f2d4e] text-[#0a0f1e] font-semibold rounded-xl px-8 py-3 text-sm transition-colors flex items-center gap-2"
        >
          {saving ? (
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-base">save</span>
          )}
          Save Settings
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-[#10b981] text-white' : 'bg-[#ef4444] text-white'
        }`}>
          <span className="material-symbols-outlined text-base">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
