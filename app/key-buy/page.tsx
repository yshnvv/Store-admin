'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchKeyBuyArticles,
  fetchKeyBuyStatus,
  pauseKeyBuy,
  resumeKeyBuy,
  triggerKeyBuy,
  updateKeyBuyConfig,
} from '../../lib/api';
import type {
  KeyBuyArticleStock,
  KeyBuyConfigUpdate,
  KeyBuyRunResult,
  KeyBuyStatus,
} from '../../types';
import { Badge, Button, Card, Input } from '../../components/ui';
import Link from 'next/link';

const POLL_INTERVAL_MS = 30_000;

interface LocalConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxBuyPerRun: number;
  defaultTargetStock: number;
}

export default function KeyBuyPage() {
  const [status, setStatus] = useState<KeyBuyStatus | null>(null);
  const [articles, setArticles] = useState<KeyBuyArticleStock[]>([]);
  // Local pending config edits (not yet saved to backend).
  const [localConfig, setLocalConfig] = useState<LocalConfig>({
    enabled: false,
    intervalMinutes: 5,
    maxBuyPerRun: 10,
    defaultTargetStock: 5,
  });
  // Per-article target stock edits, keyed by ozonOfferId (not yet saved).
  const [targetEdits, setTargetEdits] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTriggerResult, setLastTriggerResult] = useState<KeyBuyRunResult | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchKeyBuyStatus();
      setStatus(data);
      setLocalConfig({
        enabled: data.enabled,
        intervalMinutes: data.intervalMinutes,
        maxBuyPerRun: data.maxBuyPerRun,
        defaultTargetStock: data.defaultTargetStock,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load key-buy status');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadArticles = useCallback(async () => {
    try {
      const data = await fetchKeyBuyArticles();
      setArticles(data ?? []);
      setTargetEdits({});
    } catch {
      // best-effort
    }
  }, []);

  const handleToggle = async () => {
    if (!status) return;
    setToggling(true);
    setError(null);
    try {
      if (status.enabled) {
        await pauseKeyBuy();
      } else {
        await resumeKeyBuy();
      }
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle key-buy cron');
    } finally {
      setToggling(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setError(null);
    setLastTriggerResult(null);
    try {
      const result = await triggerKeyBuy();
      setLastTriggerResult(result);
      await loadStatus();
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Key-buy trigger failed');
    } finally {
      setTriggering(false);
    }
  };

  const handleConfigChange = (patch: Partial<LocalConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleEditTarget = (ozonOfferId: string, value: string) => {
    const n = Number(value);
    setTargetEdits((prev) => {
      if (!value || Number.isNaN(n) || n < 0) {
        const next = { ...prev };
        delete next[ozonOfferId];
        return next;
      }
      return { ...prev, [ozonOfferId]: n };
    });
  };

  const handleSaveConfig = async () => {
    if (!status) return;
    setSaving(true);
    setError(null);
    try {
      const targetStockPerArticle: Record<string, number> = {
        ...status.targetStockPerArticle,
      };
      for (const [ozonOfferId, target] of Object.entries(targetEdits)) {
        const article = articles.find((a) => a.ozonOfferId === ozonOfferId);
        if (article?.catalogId) {
          targetStockPerArticle[article.catalogId] = target;
        }
      }

      const body: KeyBuyConfigUpdate = {
        enabled: localConfig.enabled,
        intervalMinutes: localConfig.intervalMinutes,
        maxBuyPerRun: localConfig.maxBuyPerRun,
        defaultTargetStock: localConfig.defaultTargetStock,
        targetStockPerArticle,
      };
      const updated = await updateKeyBuyConfig(body);
      setStatus(updated);
      setLocalConfig({
        enabled: updated.enabled,
        intervalMinutes: updated.intervalMinutes,
        maxBuyPerRun: updated.maxBuyPerRun,
        defaultTargetStock: updated.defaultTargetStock,
      });
      setTargetEdits({});
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadArticles();
    intervalRef.current = setInterval(() => {
      loadStatus();
      loadArticles();
    }, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadStatus, loadArticles]);

  const enabled = localConfig.enabled;
  const intervalMinutes = localConfig.intervalMinutes;
  const maxBuyPerRun = localConfig.maxBuyPerRun;
  const defaultTargetStock = localConfig.defaultTargetStock;
  const lastRunAt = status?.lastRunAt;
  const lastResult = status?.lastResult;

  const hasUnsavedChanges =
    localConfig.enabled !== (status?.enabled ?? false) ||
    localConfig.intervalMinutes !== (status?.intervalMinutes ?? 5) ||
    localConfig.maxBuyPerRun !== (status?.maxBuyPerRun ?? 10) ||
    localConfig.defaultTargetStock !== (status?.defaultTargetStock ?? 5) ||
    Object.keys(targetEdits).length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">← Catalog bindings</Button>
        </Link>
        <Link href="/stock">
          <Button variant="ghost" size="sm">Stock sync →</Button>
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Key-buy cronjob</h1>
      <p className="text-gray-600 text-sm mb-6">
        Proactively buys FazerCards keys and stocks them in the purchased
        codes inventory so Ozon orders can be fulfilled instantly instead of
        buying a key on every order arrival. The cron runs on a configurable
        interval and buys keys for articles whose available stock is below
        their target stock.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Key-buy cron
            </div>
            <div className={`text-2xl font-bold ${enabled ? 'text-green-700' : 'text-amber-700'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </div>
            <div className="text-xs text-gray-400 mt-1">Off by default</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Interval
            </div>
            <div className="text-2xl font-bold">{intervalMinutes} min</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Max buy per run
            </div>
            <div className="text-2xl font-bold">{maxBuyPerRun}</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Default target / article
            </div>
            <div className="text-2xl font-bold">{defaultTargetStock}</div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Key-buy cron
              </label>
              <Button
                onClick={handleToggle}
                loading={toggling}
                disabled={toggling}
                variant="secondary"
                size="sm"
                active={!enabled}
              >
                {toggling
                  ? enabled
                    ? 'Disabling…'
                    : 'Enabling…'
                  : enabled
                  ? 'Disable cron (off by default)'
                  : 'Enable cron'}
              </Button>
              {enabled === false && (
                <p className="text-xs text-amber-600 mt-1">
                  Cron is disabled. It will not run until enabled.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Interval (minutes)
              </label>
              <Input
                type="number"
                min="1"
                value={intervalMinutes}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n) && n >= 1) handleConfigChange({ intervalMinutes: n });
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                How often the cron checks for articles below target stock.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Max keys to buy per run
              </label>
              <Input
                type="number"
                min="1"
                value={maxBuyPerRun}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n) && n >= 1) handleConfigChange({ maxBuyPerRun: n });
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Cap on keys purchased in a single cron run (limits spend).
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Default target stock / article
              </label>
              <Input
                type="number"
                min="0"
                value={defaultTargetStock}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (!Number.isNaN(n) && n >= 0)
                    handleConfigChange({ defaultTargetStock: n });
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Overall target stock level per FazerCards article.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <Button
              onClick={handleTrigger}
              loading={triggering}
              disabled={triggering || toggling}
              variant="primary"
            >
              {triggering ? 'Buying keys…' : 'Buy keys now'}
            </Button>
            <Button
              onClick={handleSaveConfig}
              loading={saving}
              disabled={saving || toggling || !hasUnsavedChanges}
              variant="primary"
            >
              {saving ? 'Saving…' : 'Save configuration'}
            </Button>
            <Button
              onClick={loadStatus}
              loading={loading}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              Refresh status
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Per-article target stock overrides are edited in the table below
            and saved together with "Save configuration".
          </p>
        </div>
      </Card>

      {/* Last run result */}
      {lastResult && (
        <Card className="mb-6">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Last key-buy run</h3>
            <span className="text-xs text-gray-500 font-mono">{lastResult.ranAt}</span>
          </div>
          <div className="p-4 space-y-1">
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500">Keys bought</span>
              <span className="font-mono text-gray-800">{lastResult.keysBought}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500">Articles below target</span>
              <span className="font-mono text-gray-800">{lastResult.articlesBelowTarget}</span>
            </div>
            <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
              <span className="text-gray-500">Mappings evaluated</span>
              <span className="font-mono text-gray-800">{lastResult.mappingsEvaluated}</span>
            </div>
            {lastResult.keysBoughtByArticle.length ? (
              <div className="mt-2">
                <h4 className="text-xs font-semibold text-gray-700 mb-1">
                  Bought by article
                </h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {lastResult.keysBoughtByArticle.map((a, i) => (
                    <li key={i}>
                      {a.name ?? a.catalogId}: {a.bought} bought
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {lastResult.errors.length ? (
              <div className="mt-2">
                <h4 className="text-xs font-semibold text-red-700 mb-1">Errors</h4>
                <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                  {lastResult.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {/* Per-article stock table */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Per-article target stock</h3>
          <div className="flex gap-2">
            <Button
              onClick={loadArticles}
              loading={loading}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              Reload
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          {articles.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              No mappings yet. Create an Ozon → FazerCards binding at the
              catalog bindings page.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left pb-2 text-gray-500">Ozon offer</th>
                  <th className="text-left pb-2 text-gray-500">FazerCards article</th>
                  <th className="text-left pb-2 text-gray-500 w-32">Type</th>
                  <th className="text-left pb-2 text-gray-500 w-32">Available stock</th>
                  <th className="text-left pb-2 text-gray-500 w-40">Target stock</th>
                  <th className="text-left pb-2 text-gray-500 w-32">State</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const edited = targetEdits[a.ozonOfferId];
                  const target = edited ?? a.targetStock;
                  const belowTarget = a.availableStock < target;
                  return (
                    <tr key={a.ozonOfferId}>
                      <td className="pb-1 font-medium text-gray-800 truncate max-w-xs">
                        {a.ozonOfferId}
                      </td>
                      <td className="pb-1 text-gray-700 truncate max-w-xs">
                        {a.name ?? a.catalogId ?? '—'}
                      </td>
                      <td className="pb-1 text-gray-600">
                        <Badge variant="fzr">{a.type ?? '—'}</Badge>
                      </td>
                      <td className="pb-1 font-mono text-gray-800">
                        {a.availableStock}
                      </td>
                      <td className="pb-1">
                        <Input
                          type="number"
                          min="0"
                          value={String(target ?? '')}
                          onChange={(e) => handleEditTarget(a.ozonOfferId, e.target.value)}
                          className="w-20"
                        />
                        {edited !== undefined && edited !== a.targetStock ? (
                          <span className="text-[10px] text-amber-600 ml-1">unsaved</span>
                        ) : null}
                      </td>
                      <td className="pb-1">
                        {belowTarget ? (
                          <Badge variant="new">Below target</Badge>
                        ) : (
                          <Badge variant="used">At target</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="px-4 pt-2 pb-4 text-xs text-gray-500">
          Target stock is the overall number of keys to keep in inventory per
          FazerCards article. The cron buys keys (up to max buy per run) for
          articles whose available stock is below target.
        </p>
      </Card>
    </div>
  );
}
