export function requestId(prefix = 'req'): string {
  const raw = globalThis.crypto?.randomUUID?.().replace(/-/g, '')
    ?? `${Date.now()}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${raw}`.slice(0, 64);
}

export function pendingAttemptKey(routeId: string): string {
  return `custody-training:pending-attempt:${routeId}`;
}
