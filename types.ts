export type SupplierType = 'fazercards';

export interface OzonProduct {
  offer_id: string;
  product_id?: string;
  sku?: string | number;
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
  /** Ozon numeric product id used to import digital codes. */
  productId?: number;

  /** Ozon SKU (stock keeping unit) for the product. */
  sku?: string | number;
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

export interface StockSyncResult {
  ranAt: string;
  totalMappings: number;
  mappingsWithStock: number;
  stockChanged: number;
  updatedCount: number;
  failedCount: number;
  errors: Array<{ ozonOfferId?: string; message: string }>;
  details: Array<{
    ozonOfferId: string;
    catalogId?: string;
    fazercardsStock?: number;
    ozonLastPushedStock?: number;
    action: 'skipped' | 'updated' | 'failed';
    message: string;
  }>;
}

/* ─────────────────────────────
   Fulfillment types
   ───────────────────────────── */

export type FulfillmentState =
  | 'PENDING'
  | 'CODES_ACQUIRING'
  | 'CODES_READY'
  | 'UPLOAD_IN_PROGRESS'
  | 'UPLOAD_UNKNOWN'
  | 'PARTIALLY_ACCEPTED'
  | 'CODES_ACCEPTED'
  | 'FAILED';

export interface FulfillmentRunResult {
  postingNumber: string;
  fulfillmentState: FulfillmentState;
  productsProcessed: number;
  codesAcquired: number;
  codesUploaded: number;
  codesAccepted: number;
  codesRejected: number;
  errors: string[];
}

export interface DigitalPostingView {
  postingNumber: string;
  orderId?: string;
  orderNumber?: string;
  status: string;
  waitingDeadlineForDigitalCode?: string;
  fulfillmentState: FulfillmentState;
  retryCount: number;
  lastError?: string;
  acceptedQty: number;
  rejectedQty: number;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PollingResult {
  ranAt: string;
  postingsFetched: number;
  postingsNew: number;
  postingsUpdated: number;
  postingsSkipped: number;
  fulfillmentsDispatched: number;
  errors: string[];
  details: Array<{
    postingNumber: string;
    action: 'new' | 'updated' | 'skipped' | 'dispatched' | 'failed';
    message: string;
    sku?: number;
    requiredQty?: number;
  }>;
}

export interface PollingStatus {
  isPolling: boolean;
  enabled: boolean;
  lastResult: PollingResult | null;
}

export interface KeyBuyStatus {
  enabled: boolean;
  intervalMinutes: number;
  maxBuyPerRun: number;
  defaultTargetStock: number;
  targetStockPerArticle: Record<string, number>;
  lastRunAt: string | null;
  lastResult: KeyBuyRunResult | null;
  isRunning: boolean;
}

export interface KeyBuyRunResult {
  ranAt: string;
  enabled: boolean;
  intervalMinutes: number;
  maxBuyPerRun: number;
  defaultTargetStock: number;
  targetStockPerArticle: Record<string, number>;
  mappingsEvaluated: number;
  articlesBelowTarget: number;
  keysBought: number;
  keysBoughtByArticle: Array<{
    ozonOfferId: string;
    catalogId: string;
    name?: string;
    availableBefore: number;
    target: number;
    bought: number;
  }>;
  errors: string[];
}

export interface KeyBuyArticleStock {
  ozonOfferId: string;
  catalogId: string | undefined;
  name?: string;
  type?: string;
  availableStock: number;
  targetStock: number;
  belowTarget: boolean;
}

export interface KeyBuyConfigUpdate {
  enabled?: boolean;
  intervalMinutes?: number;
  maxBuyPerRun?: number;
  defaultTargetStock?: number;
  targetStockPerArticle?: Record<string, number>;
}
