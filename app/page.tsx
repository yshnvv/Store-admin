'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  deleteMapping,
  fetchFulfillmentRecords,
  fetchFulfillmentStats,
  fetchMappings,
  fetchOzonProducts,
  fetchSupplierPurchased,
  setMapping,
} from '../lib/api';
import type {
  DigitalCatalogItem,
  DigitalProductConfig,
  FulfillmentRecord,
  FulfillmentStats,
  OzonProduct,
  StoredMapping,
  SupplierType,
} from '../types';
import { Badge, Button, Card, Input, Select } from '../components/ui';

type Tab = 'binding' | 'statistics';

export default function CatalogBindingPage() {
  const [tab, setTab] = useState<Tab>('binding');

  // --- Binding tab state ---
  const [ozonProducts, setOzonProducts] = useState<OzonProduct[]>([]);
  const [supplierArticles, setSupplierArticles] = useState<DigitalCatalogItem[]>([]);
  const [mappings, setMappings] = useState<StoredMapping[]>([]);
  const [selectedSupplierItemByOzon, setSelectedSupplierItemByOzon] = useState<Record<
    string,
    string
  >>({});
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierType>('fazercards');

  const [loadingOzon, setLoadingOzon] = useState(false);
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [binding, setBinding] = useState<Set<string>>(new Set());
  const [removingAll, setRemovingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Statistics tab state ---
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState<FulfillmentStats | null>(null);
  const [fulfillmentRecords, setFulfillmentRecords] = useState<
    FulfillmentRecord[]
  >([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const supplierItemById = useMemo(() => {
    const map = new Map<string, DigitalCatalogItem>();
    for (const a of supplierArticles) map.set(a.id, a);
    return map;
  }, [supplierArticles]);

  const mappingByOzon = useMemo(() => {
    const map = new Map<string, StoredMapping>();
    for (const m of mappings) map.set(m.ozonOfferId, m);
    return map;
  }, [mappings]);

  /* ── bindings ── */

  const loadMappings = useCallback(async () => {
    setLoadingMappings(true);
    setError(null);
    try {
      const ms = await fetchMappings();
      setMappings(ms ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mappings');
    } finally {
      setLoadingMappings(false);
    }
  }, []);

  const fetchOzon = useCallback(async () => {
    setLoadingOzon(true);
    setError(null);
    try {
      const ozon = await fetchOzonProducts();
      setOzonProducts(ozon ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Ozon articles');
    } finally {
      setLoadingOzon(false);
    }
  }, []);

  const fetchSupplier = useCallback(async () => {
    setLoadingSupplier(true);
    setError(null);
    try {
      const purchased = await fetchSupplierPurchased(selectedSupplier, 500);
      setSupplierArticles(purchased ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch supplier purchased articles');
    } finally {
      setLoadingSupplier(false);
    }
  }, [selectedSupplier]);

  const handleSelectChange = (offerId: string, value: string) => {
    setSelectedSupplierItemByOzon((prev) => ({ ...prev, [offerId]: value }));
  };

  const bind = async (offerId: string) => {
    const selectedId = selectedSupplierItemByOzon[offerId];
    if (!selectedId) {
      setError('Select a supplier article from the dropdown first');
      return;
    }
    const item = supplierItemById.get(selectedId);
    if (!item) {
      setError('Supplier article not found');
      return;
    }
    setBinding((prev) => new Set([...prev, offerId]));
    setError(null);
    try {
      const config = buildConfig(item);
      await setMapping(offerId, config);
      await loadMappings();
      setSelectedSupplierItemByOzon((prev) => {
        const next = { ...prev };
        delete next[offerId];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save binding');
    } finally {
      setBinding((prev) => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  };

  const unbind = async (offerId: string) => {
    if (!window.confirm('Remove this binding?')) return;
    try {
      await deleteMapping(offerId);
      await loadMappings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove binding');
    }
  };

  const removeAllMappings = async () => {
    if (mappings.length === 0) return;
    if (
      !window.confirm(
        `Remove all ${mappings.length} database mappings? This cannot be undone.`,
      )
    )
      return;
    setRemovingAll(true);
    setError(null);
    try {
      await Promise.all(mappings.map((m) => deleteMapping(m.ozonOfferId)));
      await loadMappings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove all mappings');
    } finally {
      setRemovingAll(false);
    }
  };

  /* ── statistics ── */

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const s = await fetchFulfillmentStats();
      setStats(s ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const rs = await fetchFulfillmentRecords();
      setFulfillmentRecords(rs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fulfillment records');
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
        <Button
          onClick={() => setTab('binding')}
          active={tab === 'binding'}
          variant="secondary"
        >
          Bind articles
        </Button>
        <Button
          onClick={() => setTab('statistics')}
          active={tab === 'statistics'}
          variant="secondary"
        >
          Statistics
        </Button>
      </div>

      {tab === 'binding' ? (
        <>
          {/* Header actions */}
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Ozon ↔ FazerCards Binding
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Fetch articles separately, then bind each Ozon product to a
                supplier article from its own row dropdown.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={fetchOzon}
                  loading={loadingOzon}
                  disabled={loadingOzon}
                  variant="primary"
                >
                  {loadingOzon ? 'Fetching Ozon…' : 'Fetch Ozon articles'}
                </Button>
                <Button
                  onClick={fetchSupplier}
                  loading={loadingSupplier}
                  disabled={loadingSupplier}
                  variant="primary"
                >
                  {loadingSupplier ? 'Fetching supplier articles…' : 'Fetch supplier articles'}
                </Button>
                <Select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value as SupplierType)}
                  className="max-w-xs"
                >
                  <option value="fazercards">FazerCards</option>
                </Select>
                <Button
                  onClick={loadMappings}
                  loading={loadingMappings}
                  disabled={loadingMappings}
                  variant="ghost"
                  size="sm"
                >
                  Reload mappings
                </Button>
              </div>
              {error && (
                <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </Card>

          {/* Counts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <div className="p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider">
                  Ozon articles
                </div>
                <div className="text-2xl font-bold">{ozonProducts.length}</div>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wider">
                  Supplier articles
                </div>
                <div className="text-2xl font-bold">{supplierArticles.length}</div>
              </div>
            </Card>
          </div>

          {/* Binding grid */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">
                Bind Ozon products to FazerCards articles
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-1/4">Ozon product</th>
                    <th className="w-1/2">FazerCards article</th>
                    <th className="w-1/6">Status</th>
                    <th className="w-1/6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ozonProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 py-6">
                        No Ozon articles fetched yet. Click "Fetch Ozon articles".
                      </td>
                    </tr>
                  ) : (
                    ozonProducts.map((p) => {
                      const mapping = mappingByOzon.get(p.offer_id);
                      const currentItem = mapping
                        ? supplierItemById.get(mapping.fazercardsConfig.catalogId ?? '')
                        : undefined;
                      const isBound = !!mapping;
                      const isBinding = binding.has(p.offer_id);

                      return (
                        <tr key={p.offer_id}>
                          <td>
                            <div className="font-medium text-gray-800">
                              {p.name ?? p.offer_id}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {p.offer_id}
                            </div>
                          </td>
                          <td>
                            <Select
                              value={selectedSupplierItemByOzon[p.offer_id] ?? ''}
                              onChange={(e) =>
                                handleSelectChange(p.offer_id, e.target.value)
                              }
                              disabled={isBound}
                              className="max-w-xs"
                            >
                              <option value="">Select an article…</option>
                              {supplierArticles.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name} ({a.type}) — {a.id}
                                </option>
                              ))}
                            </Select>
                            {currentItem && (
                              <span className="text-xs text-gray-500 block mt-1">
                                Currently: {currentItem.name}
                              </span>
                            )}
                          </td>
                          <td>
                            {isBound ? (
                              <Badge variant="used">
                                Bound:{' '}
                                {mapping.fazercardsConfig.name ??
                                  mapping.fazercardsConfig.catalogId}
                              </Badge>
                            ) : (
                              <Badge variant="ozon">Unbound</Badge>
                            )}
                          </td>
                          <td>
                            {isBound ? (
                              <Button
                                onClick={() => unbind(p.offer_id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </Button>
                            ) : (
                              <Button
                                onClick={() => bind(p.offer_id)}
                                loading={isBinding}
                                disabled={
                                  isBinding || !selectedSupplierItemByOzon[p.offer_id]
                                }
                                variant="primary"
                                size="sm"
                              >
                                Bind
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mappings table */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                Database mappings
              </h3>
              <Button
                onClick={loadMappings}
                loading={loadingMappings}
                disabled={loadingMappings}
                variant="ghost"
                size="sm"
              >
                Reload
              </Button>
              {mappings.length > 0 && (
                <Button
                  onClick={removeAllMappings}
                  loading={removingAll}
                  disabled={removingAll}
                  variant="danger"
                  size="sm"
                >
                  {removingAll ? 'Removing…' : 'Remove all'}
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-1/3">Ozon product</th>
                    <th className="w-1/3">FazerCards article</th>
                    <th className="w-1/6">Type</th>
                    <th className="w-1/6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 py-4">
                        No mappings in database yet.
                      </td>
                    </tr>
                  ) : (
                    mappings.map((m) => {
                      const cfg = m.fazercardsConfig;
                      return (
                        <tr key={m.id}>
                          <td>
                            <div className="font-medium">{m.ozonOfferId}</div>
                          </td>
                          <td>
                            <div className="font-medium">
                              {cfg.name ?? cfg.catalogId}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {cfg.catalogId}
                            </div>
                          </td>
                          <td>
                            <Badge variant="fzr">{cfg.type}</Badge>
                          </td>
                          <td>
                            <Button
                              onClick={() => unbind(m.ozonOfferId)}
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* Statistics */}
          <Card className="mb-6">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Sell statistics</h3>
              <div className="flex gap-2">
                <Button
                  onClick={fetchStats}
                  loading={loadingStats}
                  disabled={loadingStats}
                  variant="ghost"
                  size="sm"
                >
                  Refresh stats
                </Button>
                <Button
                  onClick={fetchRecords}
                  loading={loadingRecords}
                  disabled={loadingRecords}
                  variant="ghost"
                  size="sm"
                >
                  Refresh records
                </Button>
              </div>
            </div>
            <div className="p-4">
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    title="Total sells"
                    value={stats.total}
                    subtitle="Fulfillment records"
                    variant="blue"
                  />
                  <StatCard
                    title="Completed"
                    value={stats.completed}
                    subtitle="Delivered to buyer"
                    variant="green"
                  />
                  <StatCard
                    title="Failed"
                    value={stats.failed}
                    subtitle="Failed fulfillments"
                    variant="red"
                  />
                  <StatCard
                    title="Success rate"
                    value={`${stats.successRate}%`}
                    subtitle="Completed / terminal"
                    variant="purple"
                  />
                </div>
              ) : (
                <div className="text-gray-500 text-sm py-4">
                  No stats yet. Click "Refresh stats".
                </div>
              )}
            </div>
          </Card>

          {/* Fulfillment records table */}
          <Card>
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">
                Recent fulfillment records
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-1/5">Posting number</th>
                    <th className="w-1/6">Offer ID</th>
                    <th className="w-1/6">Status</th>
                    <th className="w-1/6">FZ order</th>
                    <th className="w-1/6">Created</th>
                    <th className="w-1/6">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {fulfillmentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-gray-500 py-4">
                        No fulfillment records yet.
                      </td>
                    </tr>
                  ) : (
                    fulfillmentRecords
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime(),
                      )
                      .slice(0, 20)
                      .map((r) => (
                        <tr key={r.ozonPostingNumber}>
                          <td>
                            <div className="font-medium text-gray-800 truncate">
                              {r.ozonPostingNumber}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm text-gray-600 truncate max-w-xs">
                              {r.ozonOfferId ?? '—'}
                            </div>
                          </td>
                          <td>
                            <Badge variant={statusBadgeVariant(r.fulfillmentStatus)}>
                              {r.fulfillmentStatus}
                            </Badge>
                          </td>
                          <td>
                            <div className="text-sm text-gray-600 truncate max-w-xs">
                              {r.supplierOrder?.orderId ?? '—'}
                            </div>
                          </td>
                          <td>
                            <div className="text-xs text-gray-500">
                              {new Date(r.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td>
                            <div className="text-xs text-red-600 truncate max-w-xs">
                              {r.error ?? '—'}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function buildConfig(
  item: DigitalCatalogItem,
): DigitalProductConfig {
  const config: DigitalProductConfig = {
    supplier: item.supplier,
    type: item.type ?? '',
    quantity: 1,
    label: item.name ?? item.id,
    catalogId: item.id,
    name: item.name,
    priceUsd: item.priceUsd,
    stock: item.stock,
    config: item.config,
  };
  return config;
}

function StatCard({
  title,
  value,
  subtitle,
  variant,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  variant: 'blue' | 'green' | 'red' | 'purple';
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[variant]}`}>
      <div className="text-xs font-medium text-opacity-70 mb-1">{title}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-opacity-60 mt-1">{subtitle}</div>
    </div>
  );
}

function statusBadgeVariant(status: string): 'ozon' | 'fzr' | 'used' | 'new' {
  switch (status) {
    case 'completed':
    case 'ozon_shipped':
    case 'delivered_to_buyer':
    case 'key_bought':
      return 'used';
    case 'failed':
      return 'ozon';
    case 'buying_key':
      return 'new';
    default:
      return 'fzr';
  }
}
