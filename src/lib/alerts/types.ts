/**
 * Alerts Module — Domain Types
 */

export type AlertType =
  | 'pulse_shift'
  | 'low_conversion'
  | 'zero_orders'
  | 'price_change'
  | 'stock_low';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'unread' | 'read' | 'snoozed' | 'dismissed';
export type SnoozeDuration = 1 | 24 | 168;

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  sourceId?: string;
  sourceLabel?: string;
  createdAt: string;
  snoozedUntil?: string;
  readAt?: string;
  dismissedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertPreferences {
  thresholds: {
    lowConversionRate: number; // 0.02
    zeroOrdersDays: number; // 7
    stockLowUnits: number; // 10
    pulseShiftMinScore: number; // 15
  };
  enabledTypes: AlertType[];
  mutedSeverities: AlertSeverity[];
}

export type CreateAlertInput = Omit<
  Alert,
  'id' | 'status' | 'createdAt' | 'readAt' | 'dismissedAt' | 'snoozedUntil'
>;
export type UpdateAlertInput = Partial<
  Pick<Alert, 'status' | 'snoozedUntil' | 'readAt' | 'dismissedAt'>
>;
export type AlertFilters = {
  status?: AlertStatus;
  type?: AlertType;
  severity?: AlertSeverity;
  limit?: number;
};
export type AggregationResult = { created: number; skipped: number; alerts: Alert[] };
