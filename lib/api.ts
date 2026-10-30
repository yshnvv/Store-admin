import {
  DigitalCatalogItem,
  DigitalProductConfig,
  FulfillmentRecord,
  FulfillmentStats,
  OzonProduct,
  StoredMapping,
  SupplierType,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

/** Thin wrapper around the backend catalog endpoints. */
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

/** Fulfillment statistics. */
export async function fetchFulfillmentStats() {
  return fetchJson<FulfillmentStats>('/fulfillment/stats');
}

/** All fulfillment records (sells). */
export async function fetchFulfillmentRecords() {
  return fetchJson<FulfillmentRecord[]>('/fulfillment');
}
