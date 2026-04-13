'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertFeed } from '@/components/admin/alerts/AlertFeed';
import { AlertPreferencesPanel } from '@/components/admin/alerts/AlertPreferencesPanel';
import type { Alert, AlertPreferences, AlertStatus } from '@/lib/alerts/types';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/alerts');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts ?? []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/alerts/preferences');
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences ?? null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAlerts(), fetchPreferences()]).finally(() => setLoading(false));
  }, [fetchAlerts, fetchPreferences]);

  async function handleStatusChange(id: string, status: AlertStatus) {
    const endpoint =
      status === 'read'
        ? `/api/admin/alerts/${id}/read`
        : status === 'dismissed'
          ? `/api/admin/alerts/${id}/dismiss`
          : null;

    if (!endpoint) return;

    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      }
    } catch {
      /* ignore */
    }
  }

  async function handleSavePreferences(prefs: AlertPreferences) {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/alerts/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences);
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-sm text-[#6b7280] mt-1">Monitor product health and market signals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Alert Feed */}
        <AlertFeed
          alerts={alerts}
          isLoading={loading}
          onStatusChange={handleStatusChange}
          emptyMessage="No alerts yet. Alerts will appear when products are monitored."
        />

        {/* Preferences Panel */}
        {preferences && (
          <AlertPreferencesPanel
            preferences={preferences}
            onSave={handleSavePreferences}
            isSaving={saving}
          />
        )}
      </div>
    </div>
  );
}
