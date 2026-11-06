'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchFulfillmentPostings,
  fetchFulfillmentPosting,
  fulfillPosting,
  fetchPollingStatus,
  triggerPolling,
  pausePolling,
  resumePolling,
} from '../../lib/api';
import type {
  DigitalPostingView,
  FulfillmentState,
  PollingStatus,
} from '../../types';
import { Badge, Button, Card } from '../../components/ui';
import Link from 'next/link';

const POLL_INTERVAL_MS = 30_000;

const STATE_LABELS: Record<FulfillmentState, string> = {
  PENDING: 'Pending',
  CODES_ACQUIRING: 'Acquiring Codes',
  CODES_READY: 'Codes Ready',
  UPLOAD_IN_PROGRESS: 'Uploading',
  UPLOAD_UNKNOWN: 'Upload Unknown',
  PARTIALLY_ACCEPTED: 'Partially Accepted',
  CODES_ACCEPTED: 'Accepted',
  FAILED: 'Failed',
};

const STATE_COLORS: Record<FulfillmentState, string> = {
  PENDING: 'text-gray-600',
  CODES_ACQUIRING: 'text-blue-600',
  CODES_READY: 'text-blue-600',
  UPLOAD_IN_PROGRESS: 'text-orange-600',
  UPLOAD_UNKNOWN: 'text-red-600',
  PARTIALLY_ACCEPTED: 'text-amber-600',
  CODES_ACCEPTED: 'text-green-600',
  FAILED: 'text-red-700',
};

export default function FulfillmentPage() {
  const [postings, setPostings] = useState<DigitalPostingView[]>([]);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [fulfilling, setFulfilling] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadPostings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFulfillmentPostings();
      setPostings(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load postings');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPollingStatus = useCallback(async () => {
    try {
      const data = await fetchPollingStatus();
      setPollingStatus(data);
    } catch {
      // best-effort
    }
  }, []);

  const handleTriggerPolling = async () => {
    setTriggering(true);
    setError(null);
    try {
      const result = await triggerPolling();
      setError(null);
      await loadPostings();
      await loadPollingStatus();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Polling trigger failed');
    } finally {
      setTriggering(false);
    }
  };

  const handleTogglePolling = async () => {
    if (!pollingStatus) return;
    setToggling(true);
    setError(null);
    try {
      if (pollingStatus.enabled) {
        await pausePolling();
      } else {
        await resumePolling();
      }
      await loadPollingStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to toggle polling',
      );
    } finally {
      setToggling(false);
    }
  };

  const handleFulfill = async (postingNumber: string) => {
    setFulfilling((prev) => new Set([...prev, postingNumber]));
    setError(null);
    try {
      const detail = await fetchFulfillmentPosting(postingNumber);
      if (!detail) {
        setError('Failed to load posting details');
        return;
      }

      // The posting detail view doesn't include products; the backend stores
      // products when the posting is first discovered by the poller.
      // Trigger fulfillment - backend will use stored product data.
      await fulfillPosting(postingNumber, []);
      await loadPostings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fulfillment failed');
    } finally {
      setFulfilling((prev) => {
        const next = new Set(prev);
        next.delete(postingNumber);
        return next;
      });
    }
  };

  useEffect(() => {
    loadPostings();
    loadPollingStatus();
    intervalRef.current = setInterval(() => {
      loadPostings();
      loadPollingStatus();
    }, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadPostings, loadPollingStatus]);

  const pollingEnabled = pollingStatus?.enabled ?? false;
  const lastResult = pollingStatus?.lastResult;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex flex-wrap gap-2 mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">← Catalog bindings</Button>
        </Link>
        <Link href="/stock">
          <Button variant="ghost" size="sm">Stock sync →</Button>
        </Link>
        <Link href="/key-buy">
          <Button variant="ghost" size="sm">Key-buy cron →</Button>
        </Link>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Digital Fulfillment
      </h1>
      <p className="text-gray-600 text-sm mb-6">
        Polls Ozon for digital postings awaiting codes, acquires FazerCards
        keys, and uploads them to Ozon per posting.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Poller status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Digital Poller
            </div>
            <div className={`text-2xl font-bold ${pollingEnabled ? 'text-green-700' : 'text-amber-700'}`}>
              {pollingEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Polling State
            </div>
            <div className={`text-2xl font-bold ${
              pollingStatus?.isPolling ? 'text-orange-600' : 'text-gray-600'
            }`}>
              {pollingStatus?.isPolling ? 'POLLING' : 'IDLE'}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Postings Pending
            </div>
            <div className="text-2xl font-bold">
              {postings.length}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">
              Last Run
            </div>
            <div className="text-2xl font-bold">
              {lastResult ? lastResult.postingsFetched : '—'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              fetched
            </div>
          </div>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Controls</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <Button
              onClick={handleTriggerPolling}
              loading={triggering}
              disabled={triggering || toggling || pollingStatus?.isPolling}
              variant="primary"
            >
              {triggering ? 'Polling…' : 'Poll Ozon Now'}
            </Button>
            <Button
              onClick={handleTogglePolling}
              loading={toggling}
              disabled={toggling}
              variant="secondary"
              size="sm"
              active={!pollingEnabled}
            >
              {toggling
                ? pollingEnabled
                  ? 'Pausing…'
                  : 'Resuming…'
                : pollingEnabled
                  ? 'Stop Auto-Polling'
                  : 'Start Auto-Polling'}
            </Button>
            <Button
              onClick={loadPostings}
              loading={loading}
              disabled={loading}
              variant="ghost"
              size="sm"
            >
              Refresh
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Polling fetches digital postings from Ozon and dispatches them for
            code fulfillment. The cron runs every minute automatically when
            enabled. Use Stop to halt automatic polling; manual poll can still
            be triggered.
          </p>
          {pollingEnabled === false && (
            <p className="text-xs text-amber-600 mt-1">
              Auto-polling is stopped. The cron will not run until you start it
              again.
            </p>
          )}
          {lastResult && lastResult.errors.length > 0 && (
            <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              <h4 className="font-semibold mb-1">Last Run Errors</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {lastResult.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Last run details */}
      {lastResult && lastResult.details.length > 0 && (
        <Card className="mb-6">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">
              Last Poll Run Details
            </h3>
          </div>
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left pb-2 text-gray-500">
                    Posting
                  </th>
                  <th className="text-left pb-2 text-gray-500 w-24">
                    Action
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {lastResult.details.slice(0, 30).map((d, i) => (
                  <tr key={i}>
                    <td className="pb-1 text-gray-800 truncate max-w-xs">
                      {d.postingNumber}
                    </td>
                    <td className="pb-1 text-gray-600 text-capitalize">
                      {d.action}
                    </td>
                    <td className="pb-1 text-gray-600 truncate max-w-xs">
                      {d.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Postings table */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Digital Postings
          </h3>
        </div>
        <div className="overflow-x-auto p-4">
          {postings.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              No digital postings yet. Trigger a poll to discover postings
              awaiting codes.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left pb-2 text-gray-500">
                    Posting
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    Order
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    Status
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    Fulfillment
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    Accepted
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    Rejected
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    Deadline
                  </th>
                  <th className="text-left pb-2 text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {postings.map((p) => {
                  const stateColor = STATE_COLORS[p.fulfillmentState];
                  const stateLabel = STATE_LABELS[p.fulfillmentState];
                  const isTerminal =
                    p.fulfillmentState === 'CODES_ACCEPTED' ||
                    p.fulfillmentState === 'FAILED';
                  const canFulfill =
                    p.fulfillmentState === 'PENDING' ||
                    p.fulfillmentState === 'PARTIALLY_ACCEPTED' ||
                    p.fulfillmentState === 'UPLOAD_UNKNOWN';

                  return (
                    <tr key={p.postingNumber}>
                      <td className="pb-1 font-medium text-gray-800 truncate max-w-xs">
                        {p.postingNumber}
                      </td>
                      <td className="pb-1 text-gray-700 truncate max-w-xs">
                        {p.orderNumber ?? p.orderId ?? '—'}
                      </td>
                      <td className="pb-1 text-gray-600 truncate max-w-xs">
                        {p.status}
                      </td>
                      <td className="pb-1">
                        <span className={`text-xs font-semibold ${stateColor}`}>
                          {stateLabel}
                        </span>
                      </td>
                      <td className="pb-1 text-gray-600">
                        {p.acceptedQty}
                      </td>
                      <td className="pb-1 text-gray-600">
                        {p.rejectedQty}
                      </td>
                      <td className="pb-1 text-gray-600 text-xs truncate max-w-xs">
                        {p.waitingDeadlineForDigitalCode
                          ? new Date(p.waitingDeadlineForDigitalCode).toLocaleString()
                          : '—'}
                      </td>
                      <td className="pb-1">
                        {canFulfill && !isTerminal ? (
                          <Button
                            onClick={() => handleFulfill(p.postingNumber)}
                            loading={fulfilling.has(p.postingNumber)}
                            disabled={fulfilling.has(p.postingNumber)}
                            variant="primary"
                            size="sm"
                          >
                            {fulfilling.has(p.postingNumber)
                              ? 'Fulfilling…'
                              : 'Fulfill'}
                          </Button>
                        ) : isTerminal ? (
                          <span className="text-xs text-gray-400">
                            {p.fulfillmentState === 'CODES_ACCEPTED'
                              ? 'complete'
                              : 'terminal'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            waiting
                          </span>
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
