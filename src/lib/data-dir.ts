/**
 * Data Directory Resolver
 *
 * In development: uses process.cwd() (project root)
 * In Docker production: uses STARBUY_DATA_DIR env var (mounted volume at /app/data)
 *
 * This ensures runtime data (AI memory, automations, activity logs) persists
 * across container restarts and redeploys.
 */

import { join } from 'path';

export function getDataDir(subdir: string): string {
  const base = process.env.STARBUY_DATA_DIR || process.cwd();
  return join(base, subdir);
}
