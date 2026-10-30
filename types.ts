export type SupplierType = 'fazercards';

export interface OzonProduct {
  offer_id: string;
  product_id?: string;
  name?: string;
  price?: number;
  currency_code?: string;
}

export interface DigitalCatalogItem {
  supplier: SupplierType;
  id: string;
  name?: string;
  type?: string;
  priceUsd?: string;
  stock?: number;
  config: Record<string, unknown>;
}

export interface DigitalProductConfig {
  supplier: SupplierType;
  type: string;
  quantity?: number;
  label?: string;
  config: Record<string, unknown>;
  catalogId?: string;
  name?: string;
  priceUsd?: string;
  stock?: number;
}

/** @deprecated Use DigitalProductConfig instead. */
export type FazercardsProductConfig = DigitalProductConfig;

export interface StoredMapping {
  id: string;
  ozonOfferId: string;
  fazercardsConfig: DigitalProductConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface SyncMappingResult {
  ozonOfferId: string;
  ozonProductName: string;
  fazercardsConfig?: DigitalProductConfig;
  matchStrategy: 'name' | 'exact' | 'none';
  matchScore?: number;
  matchedFzrProductName?: string;
  saved: boolean;
}

export interface SyncResult {
  totalOzonProducts: number;
  totalSupplierProducts: number;
  synced: number;
  matched: number;
  unmatched: number;
  skipped: number;
  mappings: SyncMappingResult[];
  errors: Array<{
    ozonOfferId?: string;
    ozonProductName?: string;
    message: string;
  }>;
}

export interface BuyResult {
  orderId: string;
  status: string;
  code?: string;
  boughtAt?: string;
  raw?: unknown;
}

export interface SupplierOrderRecord {
  orderId?: string;
  status?: string;
  code?: string;
  product?: any;
  boughtAt?: string;
}

export interface FulfillmentStats {
  total: number;
  byStatus: Record<string, number>;
  completed: number;
  failed: number;
  successRate: number;
}

export interface FulfillmentRecord {
  ozonPostingNumber: string;
  ozonOfferId?: string;
  ozonStatus?: string;
  customerEmail?: string;
  fulfillmentStatus: string;
  supplierOrder?: SupplierOrderRecord;
  keyDeliveredAt?: string;
  ozonShippedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
