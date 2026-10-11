import { config } from './config.js';
import type { DetectedTransfer, WatchTargets } from './types.js';

const headers = {
  'Content-Type': 'application/json',
  'X-Internal-Secret': config.internalSecret,
};

export async function getWatchTargets(): Promise<WatchTargets> {
  const res = await fetch(`${config.apiUrl}/internal/watch-targets`, { headers });
  if (!res.ok) throw new Error(`watch-targets: HTTP ${res.status}`);
  return (await res.json()) as WatchTargets;
}

export async function postTransfers(transfers: DetectedTransfer[]): Promise<void> {
  if (transfers.length === 0) return;
  const res = await fetch(`${config.apiUrl}/internal/transfers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(transfers),
  });
  if (!res.ok) throw new Error(`transfers: HTTP ${res.status}`);
}
