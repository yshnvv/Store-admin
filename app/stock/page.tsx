'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchMappings,
  fetchStockStatus,
  triggerStockSync,
  pauseStockSync,
  resumeStockSync,
} from '../../lib/api';
import type { StockSyncResult, StoredMapping } from '../../types';
import { Badge, Button, Card } from '../../components/ui';
import Link from 'next/link';

const POLL_INTERVAL_MS = 30_000;

export default function StockPage() {
  const [lastResult, setLastResult] = useState<StockSyncResult | null>(null);
  const [mappings, setMappings] = useState<StoredMapping[]>([]);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchStockStatus();
      setLastResult(data?.lastResult ?? null);
      setEnabled(data?.enabled ?? true);
    } catch {
      // best-effort
    }
  }, []);

  const loadMappings = useCallback(async () => {
    setSyncLoading(true);
    try {
      const ms = await fetchMappings();
      setMappings(ms ?? []);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to load mappings');
    } finally {
      setSyncLoading(false);
    }
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await triggerStockSync();
      setLastResult(result);
      await loadMappings();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Stock sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    setToggling(true);
    setSyncError(null);
    try {
      if (enabled) {
        await pauseStockSync();
      } else {
        await resumeStockSync();
      }
      setEnabled(!enabled);
      await loadStatus();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to toggle auto-sync');
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadMappings();
    intervalRef.current = setInterval(() => {
      loadStatus();
      loadMappings();
    }, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadStatus, loadMappings]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">← Catalog bindings</Button>
        </Link>
        <Link href="/key-buy">
          <Button variant="ghost" size="sm">Key-buy cron →</Button>
        </Link>
        <Link href="/fulfillment">
          <Button variant="ghost" size="sm">Digital fulfillment →</Button>
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock sync</h1>
      <p className="text-gray-600 text-sm mb-6">
        Syncs available FazerCards stock to Ozon every minute. For every
        Ozon→FazerCards mapping whose FazerCards stock changed since the last
        push, the worker calls Ozon&rsquo;s stock-import endpoint so Ozon buyers
        never purchase an out-of-stock gift card.
      </p>

      {syncError && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {syncError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Mappings evaluated
            </div>
            <div className="text-2xl font-bold">
              {lastResult?.totalMappings ?? '—'}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              With FazerCards stock
            </div>
            <div className="text-2xl font-bold">
              {lastResult?.mappingsWithStock ?? '—'}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Pushed to Ozon
            </div>
            <div className="text-2xl font-bold">
              {lastResult?.updatedCount ?? '—'}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Failed
            </div>
            <div className="text-2xl font-bold text-red-600">
              {lastResult?.failedCount ?? '—'}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Controls
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSync}
              loading={syncing}
              disabled={syncing || toggling}
              variant="primary"
            >
              {syncing ? 'Syncing stock…' : 'Sync stock now'}
            </Button>
            <Button
              onClick={handleToggleAutoSync}
              loading={toggling}
              disabled={toggling}
              variant="secondary"
              size="sm"
              active={!enabled}
            >
              {toggling
                ? enabled ? 'Pausing…' : 'Resuming…'
                : enabled
                ? 'Stop auto-sync'
                : 'Resume auto-sync'}
            </Button>
            <Button
              onClick={loadStatus}
              loading={syncLoading}
              disabled={syncLoading}
              variant="ghost"
              size="sm"
            >
              Refresh status
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Publishes configured stock quantity to Ozon digital warehouse.
            Key purchasing happens via the key-buy cronjob.
          </p>
          {enabled === false && (
            <p className="text-xs text-amber-600 mt-1">
              Auto-sync is paused. The cron will not run until you resume it.
            </p>
          )}
        </div>
      </Card>

      {lastResult ? (
        <Card>
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Last sync result</h3>
          </div>
          <div className="p-4 space-y-1">
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500">Ran at</span>
              <span className="font-mono text-gray-800">
                {lastResult.ranAt}
              </span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500">Outcome</span>
              <span className="font-mono text-gray-800">
                {lastResult.updatedCount} updated /{' '}
                {lastResult.failedCount} failed /{' '}
                {lastResult.mappingsWithStock -
                  lastResult.updatedCount -
                  lastResult.failedCount} unchanged
              </span>
            </div>
            {lastResult.errors.length ? (
              <div className="mt-2">
                <h4 className="text-xs font-semibold text-red-700 mb-1">
                  Errors
                </h4>
                <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                  {lastResult.errors.map((e: any, i: number) => (
                    <li key={i}>
                      {e.ozonOfferId ? `${e.ozonOfferId}: ` : ''}{e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Codes available per mapping */}
            {lastResult.details.some((d: any) => d.codes && d.codes.length) ? (
              <div className="mt-3">
                <h4 className="text-xs font-semibold text-gray-700 mb-1">
                  Available FazerCards codes per article
                </h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {lastResult.details
                    .filter((d: any) => d.codes && d.codes.length)
                    .map((d: any, i: number) => (
                      <li key={i}>
                        {d.ozonOfferId}: {d.codes.join(', ')}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      ) : (
        <div className="mb-4 p-4 rounded-lg bg-gray-100 text-sm text-gray-500">
          No stock sync has run yet. Trigger one manually or wait for the next
          cron minute.
        </div>
      )}

      {/* Mappings with stock */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Mappings</h3>
          <Button
            onClick={loadMappings}
            loading={syncLoading}
            disabled={syncLoading}
            variant="ghost"
            size="sm"
          >
            Reload
          </Button>
        </div>
        <div className="overflow-x-auto p-4">
          {mappings.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              No mappings yet. Create one at the catalog bindings page.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left pb-2 text-gray-500">
                    Ozon offer
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    FazerCards article
                  </th>
                  <th className="text-left pb-2 text-gray-500 w-32">
                    Type
                  </th>
                  <th className="text-left pb-2 text-gray-500 w-32">
                    FazerCards stock
                  </th>
                  <th className="text-left pb-2 text-gray-500 w-40">
                    Last pushed to Ozon
                  </th>
                  <th className="text-left pb-2 text-gray-500 w-24">
                    State
                  </th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => {
                  const cfg = m.fazercardsConfig as any;
                  const stock = cfg?.stock;
                  const pushed = cfg?.ozonLastPushedStock;
                  const inSync = stock === pushed;
                  return (
                    <tr key={m.id}>
                      <td className="pb-1 font-medium text-gray-800 truncate max-w-xs">
                        {m.ozonOfferId}
                      </td>
                      <td className="pb-1 text-gray-700 truncate max-w-xs">
                        {cfg?.name ?? cfg?.catalogId ?? '—'}
                      </td>
                      <td className="pb-1 text-gray-600">
                        <Badge variant="fzr">{cfg?.type ?? '—'}</Badge>
                      </td>
                      <td className="pb-1 font-mono text-gray-800">
                        {stock ?? '—'}
                      </td>
                      <td className="pb-1 font-mono text-gray-600">
                        {pushed ?? '—'}
                      </td>
                      <td className="pb-1">
                        {stock === undefined ? (
                          <Badge variant="ozon">Not in catalog</Badge>
                        ) : inSync ? (
                          <Badge variant="used">In sync</Badge>
                        ) : (
                          <Badge variant="new">Pending push</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
