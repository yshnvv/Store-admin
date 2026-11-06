import {
  DigitalCatalogItem,
  DigitalProductConfig,
  OzonProduct,
  StoredMapping,
  SupplierType,
  StockSyncResult,
  KeyBuyStatus,
  KeyBuyRunResult,
  KeyBuyArticleStock,
  KeyBuyConfigUpdate,
  FulfillmentRunResult,
  DigitalPostingView,
  PollingResult,
  PollingStatus,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

/** Thin wrapper around the backend endpoints. */
export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `API ${res.status} ${res.statusText}${
        body ? ': ' + body.slice(0, 300) : ''
      }`,
    );
  }

  const text = await res.text();
  if (!text.trim()) return undefined as T;
  return JSON.parse(text) as T;
}

/** Ozon products (shared between the admin UI and the sync service). */
export async function fetchOzonProducts() {
  return fetchJson<OzonProduct[]>('/admin/catalog/ozon');
}

/** Purchased articles from a supplier (default: fazercards). */
export async function fetchSupplierPurchased(
  supplier: SupplierType = 'fazercards',
  maxOrders?: number,
) {
  return fetchJson<DigitalCatalogItem[]>(
    `/admin/catalog/${supplier}/purchased${
      maxOrders ? `?maxOrders=${maxOrders}` : ''
    }`,
  );
}

/** All stored Ozon → supplier mappings. */
export async function fetchMappings() {
  return fetchJson<StoredMapping[]>('/admin/catalog/mapping');
}

/** Create / update one mapping. */
export async function setMapping(
  ozonOfferId: string,
  config: DigitalProductConfig,
) {
  return fetchJson<StoredMapping>('/admin/catalog/mapping', {
    method: 'POST',
    body: JSON.stringify({ ozonOfferId, fazercardsConfig: config }),
  });
}

/** Delete one mapping. */
export async function deleteMapping(ozonOfferId: string) {
  return fetchJson<void>(
    `/admin/catalog/mapping/${encodeURIComponent(ozonOfferId)}`,
    {
      method: 'DELETE',
    },
  );
}

/** Manually trigger a stock sync (FazerCards → Ozon). */
export async function triggerStockSync() {
  return fetchJson<StockSyncResult>('/admin/stock/sync', { method: 'POST' });
}

/** Disable the stock-sync cron (pause auto-sync). */
export async function pauseStockSync() {
  return fetchJson<{ enabled: boolean }>('/admin/stock/pause', {
    method: 'POST',
  });
}

/** Enable the stock-sync cron (resume auto-sync). */
export async function resumeStockSync() {
  return fetchJson<{ enabled: boolean }>('/admin/stock/resume', {
    method: 'POST',
  });
}

/** Last stock-sync result. */
export async function fetchStockStatus() {
  return fetchJson<{ lastResult: StockSyncResult | null; enabled: boolean }>(
    '/admin/stock/status',
  );
}

/** Clear the last-pushed-stock tracking on all mappings so they re-sync. */
export async function clearStock() {
  return fetchJson<{ cleared: number }>('/admin/stock/clear', {
    method: 'POST',
  });
}

/* ─────────────────────────────
   Key-buy cronjob API
   ───────────────────────────── */

/** Key-buy cronjob status + config + last run result. */
export async function fetchKeyBuyStatus() {
  return fetchJson<KeyBuyStatus>('/admin/key-buy/status');
}

/** Per-article available stock vs target stock. */
export async function fetchKeyBuyArticles() {
  return fetchJson<KeyBuyArticleStock[]>('/admin/key-buy/articles');
}

/** Manually trigger a key-buy cycle now. */
export async function triggerKeyBuy() {
  return fetchJson<KeyBuyRunResult>('/admin/key-buy/trigger', {
    method: 'POST',
  });
}

/** Disable the key-buy cron (off by default). */
export async function pauseKeyBuy() {
  return fetchJson<{ enabled: boolean }>('/admin/key-buy/pause', {
    method: 'POST',
  });
}

/** Enable the key-buy cron. */
export async function resumeKeyBuy() {
  return fetchJson<{ enabled: boolean }>('/admin/key-buy/resume', {
    method: 'POST',
  });
}

/** Update key-buy cron config (interval, max buy per run, target stock). */
export async function updateKeyBuyConfig(body: KeyBuyConfigUpdate) {
  return fetchJson<KeyBuyStatus>('/admin/key-buy/config', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/* ─────────────────────────────
   Fulfillment API
   ───────────────────────────── */

/** Manually fulfill a specific posting. */
export async function fulfillPosting(
  postingNumber: string,
  products: Array<{ offer_id: string; sku: number | string; required_qty_for_digital_code: number; quantity: number }>,
) {
  return fetchJson<FulfillmentRunResult>(
    `/admin/fulfillment/fulfill/${encodeURIComponent(postingNumber)}`,
    {
      method: 'POST',
      body: JSON.stringify({ products }),
    },
  );
}

/** List pending digital postings. */
export async function fetchFulfillmentPostings() {
  return fetchJson<DigitalPostingView[]>('/admin/fulfillment/postings');
}

/** Get a single digital posting. */
export async function fetchFulfillmentPosting(postingNumber: string) {
  return fetchJson<DigitalPostingView>(
    `/admin/fulfillment/postings/${encodeURIComponent(postingNumber)}`,
  );
}

/** Trigger a digital posting poll cycle. */
export async function triggerPolling() {
  return fetchJson<PollingResult>('/admin/fulfillment/poll/trigger', {
    method: 'POST',
  });
}

/** Get polling status. */
export async function fetchPollingStatus() {
  return fetchJson<PollingStatus>('/admin/fulfillment/poll/status');
}

/** Pause automatic polling (stop fulfillment cycle). */
export async function pausePolling() {
  return fetchJson<{ enabled: boolean }>('/admin/fulfillment/poll/pause', {
    method: 'POST',
  });
}

/** Resume automatic polling (start fulfillment cycle). */
export async function resumePolling() {
  return fetchJson<{ enabled: boolean }>('/admin/fulfillment/poll/resume', {
    method: 'POST',
  });
}
