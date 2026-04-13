'use client';

import { useState } from 'react';
import type { AlertPreferences, AlertType } from '@/lib/alerts/types';

interface AlertPreferencesPanelProps {
  preferences: AlertPreferences;
  onSave: (prefs: AlertPreferences) => void;
  isSaving?: boolean;
  className?: string;
}

const ALL_TYPES: { key: AlertType; label: string }[] = [
  { key: 'zero_orders', label: 'Zero Orders' },
  { key: 'stock_low', label: 'Stock Low' },
  { key: 'low_conversion', label: 'Low Conversion' },
  { key: 'pulse_shift', label: 'Pulse Shift' },
  { key: 'price_change', label: 'Price Change' },
];

export function AlertPreferencesPanel({
  preferences,
  onSave,
  isSaving = false,
  className = '',
}: AlertPreferencesPanelProps) {
  const [thresholds, setThresholds] = useState(preferences.thresholds);
  const [enabledTypes, setEnabledTypes] = useState<AlertType[]>(preferences.enabledTypes);

  function handleToggle(type: AlertType) {
    setEnabledTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function handleSave() {
    onSave({
      ...preferences,
      thresholds,
      enabledTypes,
    });
  }

  return (
    <div className={`rounded-xl border border-[#1f2d4e] bg-[#111827] p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-4">Alert Preferences</h3>

      {/* Thresholds */}
      <div className="space-y-3 mb-5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-[#9ca3af]">Stock Low (units)</label>
          <input
            data-testid="pref-stock-low-units"
            type="number"
            value={thresholds.stockLowUnits}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, stockLowUnits: Number(e.target.value) }))
            }
            className="w-20 px-2 py-1 rounded-lg bg-[#0d1526] border border-[#1f2d4e] text-white text-xs text-right"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-[#9ca3af]">Zero Orders (days)</label>
          <input
            data-testid="pref-zero-orders-days"
            type="number"
            value={thresholds.zeroOrdersDays}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, zeroOrdersDays: Number(e.target.value) }))
            }
            className="w-20 px-2 py-1 rounded-lg bg-[#0d1526] border border-[#1f2d4e] text-white text-xs text-right"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-[#9ca3af]">Low Conversion Rate</label>
          <input
            data-testid="pref-low-conversion-rate"
            type="number"
            step="0.001"
            value={thresholds.lowConversionRate}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, lowConversionRate: Number(e.target.value) }))
            }
            className="w-20 px-2 py-1 rounded-lg bg-[#0d1526] border border-[#1f2d4e] text-white text-xs text-right"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs text-[#9ca3af]">Pulse Shift Min Score</label>
          <input
            data-testid="pref-pulse-shift-min-score"
            type="number"
            value={thresholds.pulseShiftMinScore}
            onChange={(e) =>
              setThresholds((t) => ({ ...t, pulseShiftMinScore: Number(e.target.value) }))
            }
            className="w-20 px-2 py-1 rounded-lg bg-[#0d1526] border border-[#1f2d4e] text-white text-xs text-right"
          />
        </div>
      </div>

      {/* Type toggles */}
      <div className="space-y-2 mb-5">
        <p className="text-xs text-[#6b7280] font-medium uppercase tracking-wider">Enabled Types</p>
        {ALL_TYPES.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              data-testid={`pref-toggle-${key}`}
              type="checkbox"
              checked={enabledTypes.includes(key)}
              onChange={() => handleToggle(key)}
              className="rounded border-[#1f2d4e] bg-[#0d1526] text-[#d4a843] focus:ring-[#d4a843]/50"
            />
            <span className="text-xs text-[#9ca3af]">{label}</span>
          </label>
        ))}
      </div>

      {/* Save */}
      <button
        data-testid="pref-save-btn"
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-2 rounded-xl bg-[#d4a843] hover:bg-[#c49a3a] text-[#0d1526] text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
