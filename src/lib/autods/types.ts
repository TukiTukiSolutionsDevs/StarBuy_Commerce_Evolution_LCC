/**
 * AutoDS Integration Types
 *
 * Type definitions for AutoDS product and order sync.
 * Scaffold — actual integration pending API access.
 */

export type AutoDSProduct = {
  id: string;
  shopifyProductId: string;
  supplierUrl: string;
  supplierPrice: number;
  lastSyncAt: string;
  status: 'synced' | 'pending' | 'error' | 'out_of_stock';
};

export type AutoDSOrder = {
  id: string;
  shopifyOrderId: string;
  supplierOrderId: string | null;
  fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'failed';
  trackingNumber: string | null;
  lastUpdatedAt: string;
};

export type AutoDSConfig = {
  apiKey: string;
  storeId: string;
  enabled: boolean;
  lastSyncAt: string | null;
};
