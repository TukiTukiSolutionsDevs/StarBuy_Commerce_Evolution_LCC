/**
 * AutoDS Client
 *
 * Scaffold client — actual API calls are placeholders until AutoDS API access is granted.
 * Exposes health check and typed fetch methods that return empty data until wired up.
 */

import type { AutoDSConfig, AutoDSProduct, AutoDSOrder } from './types';

// ─── Client ──────────────────────────────────────────────────────────────────────

export class AutoDSClient {
  private config: AutoDSConfig;

  constructor(config: AutoDSConfig) {
    this.config = config;
  }

  // Returns whether AutoDS is configured and reachable
  async healthCheck(): Promise<{ connected: boolean; message: string }> {
    if (!this.config.apiKey) {
      return { connected: false, message: 'API key not configured' };
    }
    if (!this.config.enabled) {
      return { connected: false, message: 'AutoDS integration disabled' };
    }
    // TODO: Replace with actual connectivity check once API access is granted
    return { connected: false, message: 'AutoDS integration pending — API access required' };
  }

  // ─── Products ─────────────────────────────────────────────────────────────────

  // TODO: Implement with actual AutoDS API endpoint
  async getProducts(_limit?: number): Promise<AutoDSProduct[]> {
    return [];
  }

  // TODO: Implement with actual AutoDS API endpoint
  async getProduct(_shopifyProductId: string): Promise<AutoDSProduct | null> {
    return null;
  }

  // ─── Orders ───────────────────────────────────────────────────────────────────

  // TODO: Implement with actual AutoDS API endpoint
  async getOrders(_limit?: number): Promise<AutoDSOrder[]> {
    return [];
  }

  // TODO: Implement with actual AutoDS API endpoint
  async getOrder(_shopifyOrderId: string): Promise<AutoDSOrder | null> {
    return null;
  }
}

// ─── Singleton factory ────────────────────────────────────────────────────────────

export function getAutoDS(): AutoDSClient {
  return new AutoDSClient({
    apiKey: process.env.AUTODS_API_KEY ?? '',
    storeId: process.env.AUTODS_STORE_ID ?? '',
    enabled: !!process.env.AUTODS_API_KEY,
    lastSyncAt: null,
  });
}
