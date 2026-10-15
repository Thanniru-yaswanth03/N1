/**
 * N1 Utility Functions
 */

/**
 * Combines multiple CSS class names, filtering out falsy values.
 */
export function cn(...classes: unknown[]): string {
  return classes.filter((c): c is string => typeof c === 'string' && c.length > 0).join(' ');
}

/**
 * Formats a file size in bytes to a human-readable string (e.g. "1.4 MB").
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const index = Math.min(i, sizes.length - 1);

  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
}

/**
 * Formats remaining seconds into a human-readable duration (e.g., "02h 15m 30s" or "45s").
 */
export function formatSeconds(totalSeconds: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  } else if (hours > 0) {
    formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    formatted = `${pad(minutes)}:${pad(seconds)}`;
  }

  return { days, hours, minutes, seconds, formatted };
}
